---
title: VaM Reverse Engineering | VaM 技术逆向
date: 2024-09-26 00:00:00
---

# 1. 背景

全程 Virt a Mate，懂得都懂，不必多讲。

体验过 VaM 才理解，物理模拟是通往沉浸感的钥匙，涩涩是第一生产力。

作为游戏来说，VaM 没什么内容，官方案例个人看来是 VR MMD。但发展成了巨大的 UGC 内容创作平台，实属厉害。

市场上看，VaM 上线于 2020 年 5 月 ，目前商城有 40k 的资产，下载最多的资产有 7M，由此推算用户起码在百万级别，注意这软件盗版还挺容易的。官方的商业模式是订阅，Patreon 上 15k 订阅者，每月 3-10 刀，推算 ARR 至少已有 $1M。社区头部创作者 Patreon 上订阅者一般不到 1k，可以达到 $ 50k，已经基本可以养活个人开发者，不过相比于大型社区还不太高。甚至养活了一些国内的 VaM 资产盗版网站。看上去开发者 2021 年就开始做 VaM 2 了。

产品体验也稍微有些稀碎，尤其是 UI 交互离谱的简陋，不过胜在可扩展能力强，可以用 Unity/Blender 等工具直接制作 Mod。

技术上来说，发布平台是 Windows，用户需要 PCVR 串流使用。引擎使用 Unity 2018.1.9f1，使用了一些插件，下文会提。整体上来说技术并不深，性能优化离谱，但产品强在对技术局限的洞察，技术拼凑和产品运营能力。

下文细说技术方面，主要来自逆向工程：解包、抓帧。

![Frame](/images/vam_frame.jpg)

# 2. 资产制作

模型全部基于 DAZ Genesis 2，猜测一开始角色全部使用 DAZ Studio 制作的。角色基础模型大概 2W 面，开启了 GPU 细分。
同时骨骼猜测也是基于 Genesis 2 的基础模。因此，mod 制作者只能定制 morph，并不能使用任意的骨骼绑定。
比如，你可以从 DAZ 导出一个 obj 模型，然后数字雕刻，再导入回 DAZ 制作 morph 并调整骨骼，最后导出到 VaM，教程： [Guides - How to use Blender to sculpt. | Virt-A-Mate Hub (virtamate.com)](https://hub.virtamate.com/resources/how-to-use-blender-to-sculpt.2302/)


场景模型、动画、粒子和 UI 都是使用 Unity 制作的。因此，Mod 开发者可以直接在 Unity 里制作，然后使用 VaM 的导出器打包导入运行时。
[Guides - Unity AssetBundles for VaM 1.xx | Virt-A-Mate Hub (virtamate.com)](https://hub.virtamate.com/resources/unity-assetbundles-for-vam-1-xx.167/)


动画也可以在 VaM 内部制作，游戏本体提供了 Gizmo 和时间线控制。
[Guides - asco's Timeline Tutorials (1-5) | Virt-A-Mate Hub (virtamate.com)](https://hub.virtamate.com/resources/ascos-timeline-tutorials-1-5.31540/)


动画和骨骼控制这部分游戏内编辑器来自插件 BattleHub.RuntimeEditor，RuntimeGizmo 等。
[Home - Runtime Editor (battlehub.net)](https://rteditor.battlehub.net/v20/)
这套插件还带有 RedoUndo，序列化等，可以说是运行时编辑的常用方案。


此外，Mod 开发者可以写代码插件的，拓展 MVRScript 就可以控制 UI。方案来自 Dynamic C#，可以运行跑 C# 代码。
[Dynamic C# | Integration | Unity Asset Store](https://assetstore.unity.com/packages/tools/integration/dynamic-c-82084)

示例插件
[https://github.com/acidbubbles/vam-timeline](https://github.com/acidbubbles/vam-timeline)
[https://github.com/everlasterVR/TittyMagic](https://github.com/everlasterVR/TittyMagic)

# 3. 物理模拟

## 3.1 弹簧刚体

刚体物理引擎肯定是 Unity 自带的 Physx 3.4 无疑。

在这个物理引擎上是角色的骨骼物理 ragdoll 系统，配置了 collider 和 configurable joint。

没有找到 ik 相关代码，怀疑 ik 完全是通过 configurable joint 的 target rotation/position 控制的。在游戏界面中也可以找到 mass/spring 之类的参数控制，和 physx 一致。

## 3.2 头发

模拟使用了一套 Hair Tool 插件

[Asset Review: Hair Tool | Unity 2018](https://www.youtube.com/watch?v=KV4uYQjI4OE)

看上去原理相当简易，基本上就是 TressFX 的算法，自己有一套 GPU 上的物理解算。碰撞只有 Sphere Collider，然后 hair 用 PointJoint + DistanceJoint 表示，外加上风的作用影响。

GPU 模拟的代码看这里 https://github.com/axistudio/HairTool/blob/master/Assets/GPUTools/Physics/Shaders/Compute/GPWorld.compute

渲染时，从 Compute Shader 拿出来线段信息，然后用 Domain/Geometry Shader 生成几何体再绘制。

截帧可以看到某帧 Compute Buffer 长 30080，单个元素共 56 + 12 = 68 byte，猜测这单个元素是发丝单个节点的内存大小。因此推算单体头发可能千余到上万根。

不过好像物理模拟效率不是很高，单帧感觉 20-30 % 的时间在做 Compute 物理模拟，截到的一帧中，有 2000 个 Compute Dispatch 其中 1800 个在模拟头发，而且有超多的 Dispatch(1,1,1)。

## 3.3 布料和软体

模拟来自 Obi 套件

[Obi Softbody | Physics | Unity Asset Store](https://assetstore.unity.com/packages/tools/physics/obi-softbody-130029)

[Obi Cloth | Physics | Unity Asset Store](https://assetstore.unity.com/packages/tools/physics/obi-cloth-81333)

最新版本的 Obi 是 JobSystem + Compute 双端都可以，算法就是 XPBD。但当前 VaM 使用的 Obi 版本较老，是 CPU 上执行的，有一个 libOni 库引用。

## 3.4 布料 SkinWrap

此外截图的当帧还有 200 Compute Dispatch，看上去是 SkinWrap。

确实游戏内，衣服是可以根据身体变形进行跟随的。而且同屏角色不会太多，因此开发者直接使用了运行时 GPU Skinwrap 的方式。一般大型游戏中可能倾向于采用更“预设”的变形方案。

# 4. 渲染

渲染管线超简单，就是 Depth → ShadowMap → Forward Shading → UI。感觉是直接用的 Unity Builtin 管线，没有任何高级技巧和花活。

抓帧到的一帧中，在 2070 大概 30FPS。RenderDoc 模拟大概使用了 40 ms。其中 Compute 占了 40%，这里面包含 头发/布料/软体 的模拟

| Pass | Time | Drawcall / Dispatch |
| --- | --- |  --- |
| Compute | ~12ms | 2000 |
| Depth | ~1ms | 100 |
| ShadowMap 4k | ~1ms | 100 |
| ShadowMap 1k x n | ~5ms | 1200 |
| Forward Shading | ~10ms | 300 |
| UI | ~1ms | 10

默认没开后处理

Drawcall 高的主要原因，一是模型组件超多，虽然单个角色 2W 面，但是拆了四五张贴图，每张贴图又有三五个 Submesh。另一个是 shadowmap 怎么这么多???


<table>
<tr>
    <td><image src="/images/vam1.png"/> <span>口腔，舌头，牙龈，牙齿 四个模型一张 2k 贴图</span> </td>
    <td><image src="/images/vam2.png"/> 手脚 上臂下臂 腿 一张贴图，带一个纹身 decal 贴图 4k</td>
    <td><image src="/images/vam3.png"/> 耳朵，脖子，后脑勺，躯干，乳头，四个模型 一张贴图 4k</td>
    <td><image src="/images/vam4.png"/> 眼睛 一张 2k，眼球的高光会再画一遍 </td>
</tr>
<tr>
    <td><image src="/images/vam5.png"/> 前脸，嘴唇，两个模型 一张 4k</td>
    <td><image src="/images/vam6.png"/> 一张 2k </td>
    <td><image src="/images/vam7.png"/> 头发是 头皮画一次，发丝画一次 </td>
</tr>
</table>


角色甚至仿佛没有 SSS，以及好像每个光源都会重新画一遍 mesh？？但社区有 SSS 插件。

# 5. 结论

开发者将几个坑很大的问题都交给插件和引擎：

- 角色绑定和定制用 DAZ
- 运行时编辑器用 RTEditor
- 头发和布料模拟分别用 HairTool 和 Obi
- 渲染不怎么改 builtin 管线

开发者将更多的精力花在产品技术整合，虽然性能稀烂但问题不大。可以说，逆向了等于没逆向，逆向完只是发现，技术就这？更多的是给技术人员上了一课，做产品，技术够用就行。