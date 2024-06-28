---
title: Starting from implementing shadows on Unity Vision Pro | 从 Unity Vision Pro 上实现阴影说起
date: 2024-06-28 00:00:00
---

TLDR: 使用 Unity 开发 Vision Pro 应用时，由于 Vision OS 接管了大部分渲染功能，因此实现如 Shadowmap 等自定义 Feature 需要绕个弯子。由此可以一探统一空间渲染的诸多限制条件。

# 背景

项目使用 Unity 开发 Vision Pro 游戏需要渲染阴影。Unity 2022.3，Polyspatial 1.2.3，Vision OS 1.2。Shared Space，场景中同屏 Entity 在百余个的量级。以上为前提。

当然，最直接能想到的是使用 swift 的原生组件 ShadowComponent，直接可以产生投影效果。但实际使用发现，添加阴影组件后，使用时间久了以后就会掉帧。用 RealityKit Instrument Profile 一看吓一跳。啊？3亿面？

![Untitled](/images/vision-shadow-profile.png)

后续 benchmark 发现这个面数没什么规律。场景两万面，带了 Shadow Component 都有四百万的阴影面数，实在没道理。

那可以自己实现阴影了。但自己实现了一个 Shadowmap 以后，果然机器上看不到效果。果然不是这么简单！

## RealityKit
作为背景介绍绕不过去苹果 的 Realitykit。这是 Swift 的一个包，专门给空间计算使用。使用 Realitykit 可以控制场景 usd 中的 entity，一个典型的例子是这样

```swift
struct SomeView: View {
    var body: some View {
            RealityView { content in
                if let model = try? await Entity(named: "Model", in: realityKitContentBundle){
                    content.add(model)
                }
            } update: { content in
                let entity = content.entities[0]
		            entity.transform.rotation += simd_quatf(angle: radians, axis: SIMD3<Float>(1,0,0))
            }
        }
}
```

Vision OS 暴露的是这个层级的 API，但没有暴露控制更底层渲染机制的方式。

# 社区资料

Unity Polyspatial 文档并不会告诉大家这个框架如何实现的，甚至还遮遮掩掩。首先是必须企业版本才能使用到，其次它所有实现都提供的动态链接库，并不像其它模块一样提供源代码。所以，怎么实现完全靠猜和 Profile。

信息来自于这几篇贴子

**Ground Shadows for in-Program-Generated Meshes in RealityKit**

[Ground Shadows for in-Program-Gene… | Apple Developer Forums](https://forums.developer.apple.com/forums/thread/731506)

苹果官方工程师回复说，我们 Shared Space 很不一样的啦，我们会帮应用解决渲染问题，不能让应用自己控制太多底层渲染逻辑，所以后处理啊，自定义 metal 渲染啊都用不了的啦。

**Displaying a Custom Shader rendered to RenderTexture**

[https://discussions.unity.com/t/displaying-a-custom-shader-rendered-to-rendertexture/331316](https://discussions.unity.com/t/displaying-a-custom-shader-rendered-to-rendertexture/331316)

哥们想用 drawmeshinstanced 渲染，但是 realitykit 里做不了。官方的回复是，可以手动调用 `Camera.Render()` 或者手动把 rendertexture 置 dirty，让贴图能被 shader graph 使用。

**(PolySpatial) Unable to Manipulate Custom Global Properties in Shader Graph**

[https://discussions.unity.com/t/polyspatial-unable-to-manipulate-custom-global-properties-in-shader-graph/296493](https://discussions.unity.com/t/polyspatial-unable-to-manipulate-custom-global-properties-in-shader-graph/296493)

你甚至不能使用 `Shader.SetGlobalVector` 来设定材质常量，而要使用 `Unity.PolySpatial.PolySpatialShaderGlobals.SetVector(string, Vector4)`

好了，虽然官方资料不多，但七七八能够拼凑出整个完整的故事了。

# Unity PolySpatial 做了什么

1. 在 Vision OS 上跑的时候，Unity Runtime 是处于 batchmode 的。这有点像 dedicated server，只执行游戏逻辑，不执行渲染。这也是为啥一开始实现的 shadowmap 没效果—它压根没跑到。
2. 这个 Unity Runtime 会把整个场景（Scene Graph）复制一份，并构建一堆镜像的 RealityKit Entity。这些 Entity 会被 Vision OS 用作实际渲染。
    
    因为 Vision OS 只认 RealityKit Entity，因此这个镜像的过程会有一些损失，这也是为什么目前一些功能并不支持。
    
3. PolySpatial 实现了一个 dirty 机制，每当某帧的 Unity 场景发生变化，它都会捕捉到变化，并下发一个 Command 指令，更新 RealityKit Entity。

举例来说，当某帧 Unity 中一个 Mesh 更新了。Polyspatial 会执行一个 `ConvertMeshAssetToPolySpatialMesh` 转成 RealityKit 的数据，这个开销还挺大的。

![Untitled](/images/vision-scene.png)

所以总结 Polyspatial 的主要工作： 1. 翻译 Unity GameObject 到 Realitykit. 2. 提供一个 Vision OS 运行环境容纳 Entities

看到这里你可能发现两个离谱的事情。没错，一是Unity 帮你把场景镜像了一份，部分资源的内存会 Double。二是 Unity 加了一个翻译层做拷贝，性能敏感的应用听上去就难顶。

# 阴影具体实现

好了，了解到上面这层，我们实现渲染功能就简单多了。

- Unity 中自己的渲染并不是无法执行，它只是因为处于 batchmode，把渲染暂停了。
- 直接使用 Unity 的 SRP 还是有好处的，一是 Unity 在 VisionOS 上能直接调用到 Metal API，不必去写 Metal Plugin。二是 SRP Batcher 可以帮我们做一些合批优化处理。三是 ShaderGraph 能翻译到 RealityKit，比 Builtin 管线还是自由度高多了。

所以整个新增 feature 的逻辑是：

1. 新增一个 URP Universal Renderer，关掉默认 feature。
2. 自己实现个 ScriptableRendererFeature/ScriptableRendererPass，挂给上面的 Renderer
3. 场景里添加一个相机，使用上面的 Renderer
4. 相机添加一个脚本，在 Update 时调用 camera.Render() 就可以了。对应所有新增 Pass 都可以运行到。

需要一提的是， Camera.RenderWithShader 其实没啥必要了，那个是 Builtin 管线时代的 api。现在用 ScriptableRenderPass 可以自定义的更多了。

比如阴影这个例子，我们从灯光位置渲染一个深度图作为 Shadowmap就好了。Render pass 里基本只需要这么几行

```python
context.SetupCameraProperties(mainCamera);
mainCamera.targetTexture = depthHandle.rt;

var renderListDesc = new RendererListDesc(new ShaderTagId("DepthOnly"), renderingData.cullResults, mainCamera);
var renderlist = context.CreateRendererList(renderListDesc);

cmd.DrawRendererList(renderlist);
context.ExecuteCommandBuffer(cmd);
```

之后这张 RenderTexture 可以在 ShaderGraph 中被使用到了。

ShaderGraph中把世界坐标变换到阴影空间采样，就是 Shadowmap 阴影的基本原理。

# 其他的坑

### 粒子系统 Bake To Mesh

粒子系统的默认实现方式。主要原因还是 Unity 的粒子参数定义和 RealityKit 不一致，因此参数直接转换过去（Replicated Property）效果就变了。所以，每帧，Unity 会把引擎内部变形出来的粒子mesh 直接 bake 成 mesh 扔给RealityKit 。

所以，每帧一堆拷贝 mesh，性能能好才怪。

### PolySpatial Volume To World 节点

这名字一开始有点难以理解的，实际上应该理解成一个  Volume Space to World Space 矩阵。

![volume_to_world](/images/volume_to_world.png)

上文中，World Space 指的是 Unity 坐标系下的坐标，也就是编辑器里一个 Transform.position 的坐标。至于  Volume Space，可以认为是 AVP 自己设备上的一个 World Space，和 Unity 坐标系的不一样，我们可以把它叫 Volume Space。节点图中 Vertex World Position 拿出来的并不是 Unity 的 World Space。通过 Volume To World 节点才能转换为 Unity 编辑器中的坐标。

因此，在计算 Shadowmap 空间中位置时需要用这个节点特殊转换一下坐标。

好了，Vision Pro 上可以解锁自定义 Rendertexture 渲染，那 Compute 也不是问题。这样可以解锁很多渲染的花样了。

- 一些 2D 物理模拟的效果
- 程序化贴图
- Billboard 上做 Raymarching
- 一些 GI 技巧比如 Light Probe Proxy Volume，LPV 等

不过屏幕空间的技巧和后处理之类还是没有办法，毕竟只能在 RealityKit 的输入端做一些处理。

好消息是，Vision OS 2.0 刚出来。Unity 官方说新版里有了阴影的支持，不用再自己实现了。另外，Unity 官方说会整合苹果新的 LowLevelMesh API 提高翻译性能。

不过，截止本文发布时，新的 PolySpatial 版本还没发布。

# 统一空间渲染？

其实前面提到的 RealityKit 方案折衷，都是统一空间渲染权衡下的产物。不得不承认，Shared Space 是苹果的一大创新，希望各个 App 并不独占而是共享，更接近 PC 机上多任务窗口的体验。相比之下，Meta Quest 上的 Horizon OS 并不支持 Shared Space。

但如果接受 Shared Space 这个范式，代价就是 Shared Space 中开发者对渲染的控制力比较少。毕竟，传统渲染管线中开发者可以自己控制 Framebuffer 之中的任意像素。但在 Shared Space 中，Framebuffer 里还有别人的应用，总不能开放权限覆盖了别人的应用吧。

而且在 Shared Space 性能限制也较大，毕竟要和别的应用共享渲染。官方文档的推荐是：250 Drawcall，250k tris。这也就中档手机的性能水平。虽然听上去 M1 很厉害，但落到开发上也就这样。也许，Shared Space 更适合轻量休闲游戏吧。

至此，笔者有两个开放问题

- Vision OS 以后会开放在共享空间的更底层的 API 吗？
- Meta Quest 的统一空间渲染会怎么实现，开放怎样的API？

回到 Unity 的问题，可以理解成目前 Unity 基本上是把 RealityKit 当成图形 API 使用，但可玩的渲染花样比较少，而且性能堪忧。所以为什么还要用 Unity 而不是 RealityComposerPro + XCode 呢？

笔者认为有几个优点弥补了它的劣势：

1. 迭代速度。Unity PlayToDevice 所见即所得，相当接近 Quest Link 的开发体验，修改后在头显中立刻可以看到效果。而 Xcode？想进真机就要 build，虽然大部分时候 simulator 能解决 2D 迭代的问题，但游戏是另一个故事了。
2. 当下工具链成熟程度。Unity 的编辑器还是比 RealityComposerPro 好多了，无论是交互/功能丰富程度还是bug。RealityComposerPro 的材质节点编辑响应慢的离谱，导入格式支持单一，视口操作反人类。美术体验简直是负分。
3. 生态和插件。尤其是美术资产，美术编辑工具，动画和物理。
4. 跨平台

所以，主要还是看应用场景的需求，某些情况下现在还真就得用 Unity。

很快 Unity 应该就会出支持 Vision OS 2.0 的 Polyspatial 版本，也期待一下。

# 参考资料

[Ground Shadows for in-Program-Gene… | Apple Developer Forums](https://forums.developer.apple.com/forums/thread/731506)

[https://developer.apple.com/documentation/visionos/reducing-the-rendering-cost-of-realitykit-content-on-visionos](https://developer.apple.com/documentation/visionos/reducing-the-rendering-cost-of-realitykit-content-on-visionos)

https://discussions.unity.com/t/displaying-a-custom-shader-rendered-to-rendertexture/331316

[https://discussions.unity.com/t/polyspatial-unable-to-manipulate-custom-global-properties-in-shader-graph/296493](https://discussions.unity.com/t/polyspatial-unable-to-manipulate-custom-global-properties-in-shader-graph/296493)