---
title: Unity ECS, Swarm Animation and Markov Chain| ECS集群动画与马尔可夫链
date: 2018-11-24 00:00:00
---
# 20181124 ECS, 集群动画和马尔可夫链

![gif_animation_007.gif](image/gif_animation_007.gif)

![gif_animation_005.gif](image/gif_animation_005.gif)

交通模拟的项目，要添加大量的行人，自然想到的肯定要用animation instancing。其主要思路是把骨骼动画烘焙成贴图，skinning状态是per instance的，在vertex shader中读取animation texture做skinning运算。笔者这里有几点不同。

- 视角更远，甚至都没必要做骨骼蒙皮，直接用顶点动画即可
- 动画状态机没有gameplay逻辑，是一个随机过程就好

UnityAustinTechnicalPresentation提供了一个ECS的集群动画案例，虽然其代码已经编译不出来了，但是通过阅读源码可以了解其大致逻辑

- 启动时将骨骼动画数据烘焙成动画贴图
- gameplay逻辑中更新状态ID，这部分相当于hardcode的状态机。Job里面目测没法反射或者模板，animator自然是不能用了。Hardcode状态机是不太好维护了。
- per instance数据更新进NativeArray，直接就可以转成ComputeBuffer，然后DrawMeshInstancedIndirect

做法基本遵循了Animation Instancing的方法。

笔者这里的方法是：

- 使用Houdini预先烘焙顶点动画贴图
- 使用转移矩阵控制动画状态切换，即Markov Chain，使用Job并行更新状态
- DrawMeshInstance

这样主要优点是

- shader运算量更小，顶点不用做skinning直接采样位置就行
- 避免动画状态机hardcoding，方便配置

当然缺点就是近距离观察效果不好，动画没有gameplay逻辑了，因此只适用于背景性的大规模集群动画。

顶点动画制作

动画数据直接就用Houdini自带的MocapBiped了，只是要做一下减面。减面稍微有点trick是原始模型上下半身和头是分开的mesh，需要先fuse再polyreduce。之后烘焙顶点动画用GameDevelopmentTool很容易，笔者这里将四个动画烘焙在一张贴图上。256个顶点512帧，正好256\*512的贴图。

下图是houdini中一个原始动画的效果预览

![bandicam_2018-11-24_00-20-37-016.gif](image/bandicam_2018-11-24_00-20-37-016.gif)

动画状态转换

马尔可夫链就是一个状态转移的随机过程，这和我们随机动画的性质很相似，可以让下一个动画出现的概率只跟上一个动画相关，用一个转移矩阵表示。

比如下面表示了一个四个动画状态的转移矩阵，每一列列头是原始状态，每一列之和是1。每一行是下一个状态的概率。

|     |walk|run|stand|wait|
|-----|----|---|-----|----|
|walk |0.6 |0.5|0.7  |0.7 |
|run  |0.2 |0.1|0.1  |0.1 |
|stand|0.1 |0.3|0.1  |0.1 |
|wait |0.1 |0.1|0.1  |0.1 |

这个好处是代码实现足够简单，状态也很丰富。完全可通过参数配置不必hardcode状态机。另外一个好处是与Job System相关的，Job里目前只能有blitable type，目前还不支持把animator放进Job里面。笔者这里只做了四个动画部分原因也是ECS新的版本没有FixedArray了，定长数组不知道怎么写，最多只能存一个float4x4了。

这样动画状态转换只需要几十行的一个job就行

```
[BurstCompile]
        struct PedestrianStateTransitionJob : IJobParallelFor
        {
            public ComponentDataArray<PedestrianData> PedestrianData;
            public ComponentDataArray<PedestrianState> States;
            public ComponentDataArray<InstanceRendererProperty> StateProperty;
            public Random RdGen;
            public float DeltaTime;
            public PedestrianAnimStateConfig PedestrianAnimStateConfig;
            public void Execute(int index)
            {
                int currentState = States[index].State;
                float cd = States[index].CoolDown - DeltaTime;
                if (cd < 0)
                {
                    PedestrianState newstate = States[index];
                    PedestrianData newdata = PedestrianData[index];
                    InstanceRendererProperty newproperty = StateProperty[index];
                    int nextstate = NextState(currentState);
                    newproperty.Value =  PedestrianAnimStateConfig.StateFrameRange[nextstate];
                    newstate.CoolDown = RdGen.NextFloat(
                        PedestrianAnimStateConfig.DurationRange[nextstate].x,
                        PedestrianAnimStateConfig.DurationRange[nextstate].y);
                    newdata.Speed = RdGen.NextFloat(
                        PedestrianAnimStateConfig.SpeedRange[nextstate].x,
                        PedestrianAnimStateConfig.SpeedRange[nextstate].y);
                    
                    StateProperty[index] = newproperty;
                    PedestrianData[index] = newdata;
                    States[index] = newstate;
                }
                else
                {
                    States[index] = new PedestrianState() {CoolDown = cd, State =  currentState};
                }
            }
            //markov chain, sample from transition probability matrix
            int NextState(int currentState)
            {
                int nextstate = 3;
                float3 transitionPoss =  PedestrianAnimStateConfig.TransitionProbability[currentState];
                float randseed = RdGen.NextFloat();
                if (randseed < transitionPoss.x)
                {
                    nextstate = 0;
                }
                else if (randseed < transitionPoss.x + transitionPoss.y)
                {
                    nextstate = 1;
                }
                else if (randseed < transitionPoss.x + transitionPoss.y +  transitionPoss.z)
                {
                    nextstate = 2;
                }
                return nextstate;
            }
        }
```

渲染调用

最近的ECS更新中，虽然有了MeshInstanceRenderer这个组件，但问题是没法设置instancing的参数数组，因此就必须自己写一套Instancing System来传递这个参数数组。

ECS原生的MeshInstanceRendererSystem中还耦合一套LODSystem相对较为复杂，笔者这里甚至都不需要LOD，毕竟都已经顶点动画了，只是超过一定距离裁剪掉好了。但可以参考MeshInstanceRendererSystem中做Batch的方法，用SharedComponentData的ID作为key，添加到NativeMultiHashmap中，因为每次drawmeshinstance肯定是同一个SharedComponentData啦。

一个比较蠢的事情是想在ComponentSystem里面访问SharedComponentData很麻烦，只能用ArchetypeChunks来访问SharedComponentData。这里ArchetypeChunks可能可以理解成一组内存中的区域，component数据紧密聚集在这个chunks中。一个entityarray是可能有几个ArchetypeChunks的。分线程开Job的时候可能也是扔给它一个ArchetypeChunks，毕竟要提高缓存命中嘛。

不过用ArchetypeChunks有个好处是可以加个lodsystem，让每个ArchetypeChunks的lod都不一样，这样方便batch，不用用迭代器逐元素访问来batch，直接一个memcpy就一组过去了，快一些，原生MeshInstanceRendererSystem目测是这么搞的？

总之呢我们显示通过视锥剔除将可见的添加到NativeMultiHashmap，然后逐key访问元素batch起来就好了。

遍历的代码大概长这样

```
public void Render()
        {
            for (int i = 0; i < _renderData.Count; i++)
            {
                if (_renderData[i].Material && _renderData[i].Mesh)
                {
                    Entity ent;
                    NativeMultiHashMapIterator<int> iterator;
                    if (_batcher.TryGetFirstValue(i, out ent, out iterator))
                    {
                        InstanceRendererProperty prop =  EntityManager.GetComponentData<InstanceRendererProperty>(ent);
                        _renderer.Init(_renderData[i], prop);
                        _renderer.Batch(ent);
                        while (_batcher.TryGetNextValue(out ent, ref iterator))
                        {
                            _renderer.Batch(ent);
                        }
                        _renderer.Final();
                    }
                }
            }
        }
```

renderer里面核心是submit和batch这俩，跟MeshInstanceRendererSystem区别主要是多了一个MaterialPropertyBlock设置instancing参数。

```
private void Submit()
        {
            Utils.CopyToFloat4(propertyParams, param);
            Utils.CopyToFloat4x4(matrices, transforms);
            propertyBlock.SetVectorArray(shaderId, param);
            Graphics.DrawMeshInstanced(data.Mesh, data.SubMesh, data.Material,  transforms, batchCount, propertyBlock, data.CastShadows, data.ReceiveShadows);
            batchCount = 0;
        }
        public void Batch(Entity ent)
        {
            if (batchCount >= 1023)
            {
                Submit();
            }
            var loc = manager.GetComponentData<LocalToWorld>(ent);
            var prop = manager.GetComponentData<InstanceRendererProperty>(ent);
            matrices[batchCount] = loc.Value;
            propertyParams[batchCount] = prop.Value;
            batchCount++;
        }
```

注意batch完用DrawMeshInstanceIndirect的方法可能性能更好，不过移动端支持会比较差，估计也就iphone能行。

[https://github.com/Unity\-Technologies/EntityComponentSystemSamples/blob/8f94d72d1fd9b8db896646d9d533055917dc265a/Documentation/reference/chunk\_iteration.md](https://github.com/Unity-Technologies/EntityComponentSystemSamples/blob/8f94d72d1fd9b8db896646d9d533055917dc265a/Documentation/reference/chunk_iteration.md)

[https://en.wikipedia.org/wiki/Stochastic\_matrix](https://en.wikipedia.org/wiki/Stochastic_matrix)
