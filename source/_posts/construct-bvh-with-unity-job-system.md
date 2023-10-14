---
title: Construct BVH with Unity Job System | 用Unity JobSystem构造BVH
date: 2018-11-20 00:00:00
---

BVH [https://en.wikipedia.org/wiki/Bounding_volume_hierarchy](https://en.wikipedia.org/wiki/Bounding_volume_hierarchy) 是一种空间存储数据结构，便于空间查找。类似的空间查找方法还有BSP，OcTree等等。

BVH的构造/查询比较快，空间冗余也比较少，在实时图形学领域用的比较广泛。比如NVidia的RTX技术，就是固定管线实现了BVH便于RayTracing加速。[https://devblogs.nvidia.com/nvidia-turing-architecture-in-depth/](https://devblogs.nvidia.com/nvidia-turing-architecture-in-depth/)

BVH是有并行算法的，也就便于利用Unity JobSystem多线程构造。

本来想抄ECSPhysics代码的代码，但是发现它构造出来的BVH有bug....

于是基本参考了Thinking Parallel, Part III: Tree Construction on the GPU这篇经典文章[https://devblogs.nvidia.com/thinking-parallel-part-iii-tree-construction-gpu/](https://devblogs.nvidia.com/thinking-parallel-part-iii-tree-construction-gpu/)，自己在Unity中实现

构造BVH对于剔除，物理，swarm通信都是很重要的。

基本的流程：1. 构造ZOrder 2. 排序 3 构造子节点 4 构造内部节点 5 更新AABB

# 1. ZOrder Curve & Morton Code

是一种将多维数据降为一维的方法，降为一维的好处是便于排序，便于存储。用这种方法将场景物体排序后再并行构造BVH会比较方便

[https://en.wikipedia.org/wiki/Z-order_curve](https://en.wikipedia.org/wiki/Z-order_curve)

ECSPhysics里是有计算MortonCode的方法的，Tree Construction on the GPU原文里也有

[https://github.com/PhilSA/ECSPhysics](https://github.com/PhilSA/ECSPhysics)

自然就直接抄过来了。需要注意的是xyz只有10bit的空间，对大量物体是不够用的，这也会出现mortoncode相同的情况，后面会遇到这个问题。

注意CalculateMortonCode要输入一个0-1的向量，上面ECSPhysics似乎代码写错了

```
[MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static uint ExpandBits(uint v)
        {
            v = (v * 0x00010001u) & 0xFF0000FFu;
            v = (v * 0x00000101u) & 0x0F00F00Fu;
            v = (v * 0x00000011u) & 0xC30C30C3u;
            v = (v * 0x00000005u) & 0x49249249u;
            return v;
        }
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static uint CalculateMortonCode(float3 vector)
        {
            vector.x = math.min(math.max(vector.x * 1024.0f, 0.0f), 1023.0f);
            vector.y = math.min(math.max(vector.y * 1024.0f, 0.0f), 1023.0f);
            vector.z = math.min(math.max(vector.z * 1024.0f, 0.0f), 1023.0f);
            uint xx = ExpandBits((uint) vector.x);
            uint yy = ExpandBits((uint) vector.y);
            uint zz = ExpandBits((uint) vector.z);
            return (xx * 4 + yy * 2 + zz);
        }
```

对于Y方向变化不大的情况可以用2D的版本，这样xz各有16bit，大大减少morton code相同的情况。

```
[MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static uint ExpandBits2D(uint v)
        {
            v &= 0x0000ffff;
            v |= (v << 8);
            v &= 0x00ff00ff;
            v |= (v << 4);
            v &= 0x0f0f0f0f;
            v |= (v << 2);
            v &= 0x33333333;
            v |= (v << 1);
            v &= 0x55555555;
            return v;
        }
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static uint CalculateMortonCode2D(float3 vector)
        {
            vector.x = math.min(math.max(vector.x * 65536.0f, 0.0f), 65536.0f);
            vector.z = math.min(math.max(vector.z * 65536.0f, 0.0f), 65535.0f);
            uint xx = ExpandBits2D((uint)vector.x);
            uint zz = ExpandBits2D((uint)vector.z);
            return (xx * 2 + zz);
        }
```

# 2. 排序

ECSPhysics代码里用Radix单线程排的序，Profile看这也是性能瓶颈之一，一核有难七核围观

并行排序可以考虑Bitonic Sort，时间复杂度是o(log(n)^2)。很好的是每个pass不会有dataracing的。原理和双调序列的特性相关，有Batcher定理：这篇文章讲的很好，三十分钟理解：双调排序Bitonic Sort，适合并行计算的排序算法

[https://blog.csdn.net/xbinworld/article/details/76408595](https://blog.csdn.net/xbinworld/article/details/76408595)

于是笔者用Job实现了Bitonic Sort。比较麻烦的是Job好像不能递归调用，只能一个pass开一个job了

```
[BurstCompile]
    struct BitonicMergeJob : IJobParallelFor
    {
        [NativeDisableParallelForRestriction]
        public NativeArray<uint> values;
        [NativeDisableParallelForRestriction]
        public NativeArray<int> indexConverter;
        public int strideSwap;
        public int strideRisingGroup;
        public void Execute(int index)
        {
            int swapPairId = index / strideSwap;
            int swapGroupId = index - swapPairId * strideSwap;
            int swapGroupStartId = swapPairId * 2 * strideSwap;
            int swapIdFirst = swapGroupStartId + swapGroupId;
            int swapIdSecond = swapIdFirst + strideSwap;
            int risingGroupId = swapPairId / strideRisingGroup;
            bool rising = risingGroupId % 2 == 0 ? true : false;
            if (values[swapIdFirst] > values[swapIdSecond] == rising)
            {
                uint tempValue = values[swapIdFirst];
                int tempId = indexConverter[swapIdFirst];
                values[swapIdFirst] = values[swapIdSecond];
                indexConverter[swapIdFirst] = indexConverter[swapIdSecond];
                values[swapIdSecond] = tempValue;
                indexConverter[swapIdSecond] = tempId;
            }
        }
    }
    [BurstCompile]
    struct BitonicSortJob : IJobParallelFor
    {
        [NativeDisableParallelForRestriction]
        public NativeArray<uint> values;
        [NativeDisableParallelForRestriction]
        public NativeArray<int> indexConverter;
        public int strideSwap;
        public void Execute(int index)
        {
            int swapPairId = index / strideSwap;
            int swapGroupId = index - swapPairId * strideSwap;
            int swapGroupStartId = swapPairId * 2 * strideSwap;
            int swapIdFirst = swapGroupStartId + swapGroupId;
            int swapIdSecond = swapIdFirst + strideSwap;
            if (values[swapIdFirst] > values[swapIdSecond])
            {
                uint tempValue = values[swapIdFirst];
                int tempId = indexConverter[swapIdFirst];
                values[swapIdFirst] = values[swapIdSecond];
                indexConverter[swapIdFirst] = indexConverter[swapIdSecond];
                values[swapIdSecond] = tempValue;
                indexConverter[swapIdSecond] = tempId;
            }
        }
    }
```

调用是在JobComponentSystem里

```
var bitonicMergeJob = new BitonicMergeJob()
            {
                values = mortonCodes,
                indexConverter = indexConverter
            };
            var bitonicSortJob = new BitonicSortJob()
            {
                indexConverter = indexConverter,
                values = mortonCodes
            };
            int pass = (int)math.log2(mortonCodes.Length);
            for (int i = 0; i < pass - 1; i++)
            {
                for (int j = 0; j <= i; j++)
                {
                    bitonicMergeJob.strideSwap = 1 << (i - j);
                    bitonicMergeJob.strideRisingGroup = 1 << j;
                    deps = bitonicMergeJob.Schedule(mortonCodes.Length / 2, 64,  deps);
                }
            }
            for (int i = 0; i < pass; i++)
            {
                bitonicSortJob.strideSwap = 1 << (pass - i - 1);
                deps = bitonicSortJob.Schedule(mortonCodes.Length / 2, 64, deps);
            }
```

Profile看确实比原来的单线程快一些，但可能有线程调用和开销，也不是很理想。

# 3. 构造子节点

没有什么技术含量，这里就不放代码了

# 4. 构造内部节点

karras原文里放了伪码，Tree Construction on the GPU里面也放了C++的代码。但是determineRange(i)，这个函数代码没给出来。

其实主要划分成三步

determinrange

findsplit

output

第一步找到split可能出现的范围，第二步binary search找split，第三步输出

![17c78a564d5fcd1455ebd1825a028ebf.png](/images/17c78a564d5fcd1455ebd1825a028ebf.jpg)

其实也好实现，照抄伪码就行。这步是很神的。先binary往前找最远的range，再binary往回找最近的range。

```
int2 determineRange(int i)
        {
            int d = (clz_safe(i, i + 1) - clz_safe(i, i - 1)) > 0 ? 1 : -1;
            int commonPrefixMin = clz_safe(i, i - d);
            int l_max = 2;
            while (clz_safe(i, i + d * l_max) > commonPrefixMin)
            {
                l_max *= 2;
            }
            int l = 0;
            int t = l_max;
            do
            {
                t = (t + 1) >> 1; // exponential decrease
                if (clz_safe(i, i + d * (l + t)) > commonPrefixMin)
                {
                    l += t;
                }
            } while (t > 1);
            int j = i + l * d;
            int2 range = d > 0 ? new int2(i, j) : new int2(j, i);
            return range;
        }
```

这时会遇到一个大坑，clz的计算。__clz是C++原生的，c#里只能面向stackoverflow

```
//https://stackoverflow.com/questions/10439242/count-leading-zeroes-in-an-int32
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private int clz_value(uint value1, uint value2)
        {
            uint value = value1 ^ value2;
            //do the smearing
            value |= value >> 1;
            value |= value >> 2;
            value |= value >> 4;
            value |= value >> 8;
            value |= value >> 16;
            //count the ones
            value -= ((value >> 1) & 0x55555555);
            value = (((value >> 2) & 0x33333333) + (value & 0x33333333));
            value = (((value >> 4) + value) & 0x0f0f0f0f);
            value += (value >> 8);
            value += (value >> 16);
            return (int)(32 - (value & 0x0000003f));
        }
```

然后又会遇到一个大坑，mortoncode一样怎么办？？？

如果mortoncode一样的话构造bvh时，determinrange和findsplit都会出错，最后树节点上会有环，没法更新aabb了。

论文里第四节有讲，             //[https://devblogs.nvidia.com/parallelforall/wp-content/uploads/2012/11/karras2012hpg_paper.pdf](https://devblogs.nvidia.com/parallelforall/wp-content/uploads/2012/11/karras2012hpg_paper.pdf)

![974f044acc93c74ae1bab6eb1f76c8fb.png](/images/974f044acc93c74ae1bab6eb1f76c8fb.jpg)

一样的话用index算一下。

```
private int clz_safe(int idx, int idy)
        {
            if (idy < 0 || idy > NumObjects - 1) return -1;
            return clz_index(idx, idy);
        }
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        private int clz_index(int idx, int idy)
        {
            //rely on morton being unique, otherwise clz its index
            //see section 4. BVHs, Octrees, and k-d Trees
            return mortonCodes[idx] == mortonCodes[idy]
                ? (NumObjects - math.max(idx, idy)) + 32
                : clz_value(mortonCodes[idx], mortonCodes[idy]);
        }
```

# 5. 更新AABB

bottom-up更新，第一个到的节点退出。这里理应有一锁，避免datarace。实际应用中不太会写，目前这样偶尔会出错但一般问题不大。

```
    [BurstCompile]
    unsafe struct UpdateAABBJob : IJobParallelFor
    {
        [NativeDisableParallelForRestriction] public NativeArray<BVHNode>  BVHArray;
        [NativeDisableUnsafePtrRestriction]
        public long* locks;
        public void Execute(int i)
        {
            int halfLength = BVHArray.Length / 2;
            int leafNodeId = halfLength + i;
            AABB leafNodeAABB = BVHArray[leafNodeId].aabb;
            int parentIndex = BVHArray[leafNodeId].ParentNodeIndex;
            while (parentIndex != -1)
            {
                //todo locks!
                BVHNode parent = BVHArray[parentIndex];
                if (parent.IsValid < 1)
                {
                    parent.aabb = leafNodeAABB;
                    parent.IsValid = 1;
                    BVHArray[parentIndex] = parent;
                    break;
                }
                else
                {
                    parent.aabb = Utils.GetEncompassingAABB(parent.aabb,  leafNodeAABB);
                    parent.IsValid = 2;
                    BVHArray[parentIndex] = parent;
                }
                leafNodeAABB = parent.aabb;
                parentIndex = parent.ParentNodeIndex;
            }
        }
}
```

计算方法[https://www.forceflow.be/2013/10/07/morton-encodingdecoding-through-bit-interleaving-implementations/](https://www.forceflow.be/2013/10/07/morton-encodingdecoding-through-bit-interleaving-implementations/)

Morton Code

[https://www.forceflow.be/2013/10/07/morton-encodingdecoding-through-bit-interleaving-implementations/](https://www.forceflow.be/2013/10/07/morton-encodingdecoding-through-bit-interleaving-implementations/)

[https://github.com/Forceflow/libmorton/blob/master/libmorton/include/morton2D.h](https://github.com/Forceflow/libmorton/blob/master/libmorton/include/morton2D.h)

[https://github.com/aperley/parallel-bvh](https://github.com/aperley/parallel-bvh)

[https://devblogs.nvidia.com/thinking-parallel-part-iii-tree-construction-gpu/](https://devblogs.nvidia.com/thinking-parallel-part-iii-tree-construction-gpu/)

ECSPhysics

[https://docs.google.com/document/d/14IwE_A3mC5clYs8XuQ8mXDCO0NhAEPW0ziczVarmr4Q/edit#](https://docs.google.com/document/d/14IwE_A3mC5clYs8XuQ8mXDCO0NhAEPW0ziczVarmr4Q/edit#)

[https://github.com/PhilSA/ECSPhysics](https://github.com/PhilSA/ECSPhysics)
