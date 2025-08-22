---
title: 3DGS Application Analysis in the Film and Game Industries | 3D Gaussian Splatting：影视与游戏领域的应用分析
date: 2025-08-20 00:00:00
tags:
  - Virtual Reality
  - Tech Review
  - Game Development
  - 3DGS
---

3DGS（3D Gaussian Splatting）作为一种替代 NeRF 的光场渲染技术，凭借三维高斯分布对场景的高效表示与光栅化渲染的实时性优势，正逐渐展现出在视觉内容创作领域的潜力。需要说明的是，下文所讨论的 “3DGS” 并非局限于原始论文的技术框架，而是指代这一类光场渲染技术 —— 毕竟技术的演进始终在动态发展中。

# 1. 影视领域：制作流程的重构与商业化机会

## 1.1 3DGS 如何重构影视制作流程？

若暂不考虑技术实现的时间线，未来电影的形态大概率会向 “超梦式 VR 体验” 演进 —— 这种体验以更高的沉浸感为核心，其普及依赖三个前提：VR 设备的轻量化与画质升级、空间视频拍摄技术的成熟，以及内容创作流程的革新。而这些前提在可预期的未来均具备实现基础。

现有电影（含短片）的拍摄流程已相当成熟：剧本→分镜→布景化妆→拍摄→剪辑后期。即便是含特效的实拍项目，也只是增加了绿幕拍摄环节，整体流程未发生本质变化。

而 3DGS 技术或将推动影视流程向更高效的方向重构：剧本→分镜→（简化的）布景和化妆→（空间光场）拍摄→剪辑→（空间化的）后期。

这一流程的核心变化在于：  

- 布景与化妆的简化：得益于 3DGS 的后期编辑能力。如论文《Drag Your Gaussian》展示的技术，通过调整高斯点的位置、颜色等参数。如论文《ReplaceAnything3D》，可直接在空间中实现换脸、替换道具甚至修改场景结构，无需前期搭建复杂实景或进行精细妆造。
  
- 拍摄设备的革新：未来可能出现商用化的空间光场捕捉设备（类似当前 Lytro 光场相机的进阶形态，或 Google Beam 的空间视频捕捉技术），其输出格式将直接适配 3DGS，实现 “拍摄即生成可编辑的三维场景”。

## 1.2 影视领域的核心商业化机会

新流程将催生两类核心商业机会：  

其一，空间光场拍摄设备。这类设备需具备高精度、低成本的空间信息捕捉能力，既要满足影视级画质，又要适配 3DGS 的参数格式（如高斯点的位置、协方差、透明度等），目前已有科研级设备（如多相机阵列扫描系统），但商用化需解决便携性与成本问题。

其二，AIGC 驱动的后期编辑工具。传统影视后期依赖 Premiere、Nuke 等工具的线性编辑逻辑，而 3DGS 的后期工具将深度融合 AIGC 能力 —— 类似 AI 图片编辑领域的 ComfyUI 生态（通过节点化工作流实现复杂效果），未来工具可能支持 “自然语言指令修改场景”（如 “将背景换成雨夜”）、“实时预览空间编辑效果” 等交互方式，彻底重构后期工作流。

# 2. 游戏领域：3DGS 的应用潜力与现实瓶颈

仅从技术形态看，3D 游戏的核心矛盾在于 “真实感” 与 “实时性” 的平衡，3DGS 在这一领域的应用需从形态、瓶颈与混合方案三方面探讨。

## 2.1 游戏为何需要实体化空间场景？——3DGS 的成本与效率优势

未来游戏的场景表示是否会走向纯视频生成（如 Genie 模型展示的 “文本生成可交互视频”）？答案是否定的，核心原因在于成本与效率。

Genie 这类依赖神经网络生成每一帧画面的技术，虽能实现 “无实体场景” 的交互，但单帧生成成本极高（需大量 GPU 计算资源）；而 3DGS 通过光栅化渲染（利用 GPU 硬件加速），可将 “生成复杂场景” 的成本从 “每帧 1 元” 压缩至 “每帧 1 分钱”—— 例如，3DGS 的高斯点可直接通过硬件光栅化管线渲染，帧率轻松达标。而将类似 Genie 这种所谓“世界模型”转化成 3DGS 实体空间表示又不是成本很高的事情。

这就意味着，即使存在 Genie 这种技术，在商用上游戏仍需 “实体化空间场景”（即场景由可计算的三维元素构成），这意味着环境、道具、角色等资源仍需拆分制作，3DGS 的角色是作为这类资源的新型表示方式存在。

## 2.2 3DGS 在游戏应用中的核心瓶颈

使用 3DGS 制作单体资源目前看还是有瓶颈。  

其一在于效率，其二在于灯光，其三在于物理。

### 2.2.1 效率瓶颈：移动端适配与资源开销问题

传统网格模型 + UV 贴图的优势在于 “低开销”：用少量三角形和压缩贴图即可表示复杂物体，而 3DGS 目前在效率上仍存短板。

移动端 GPU 的内存带宽与计算能力有限，目前移动端网格模型可支持同屏百万面的 72FPS 渲染，而 3DGS 的高斯点（Splat）在移动设备上同屏百万级别时已接近性能极限，且同等带宽下的显示精度未必优于网格，如 Unity-VR-Gaussian-Splatting 的实测数据：Quest3 同屏 400k Gaussian

具体瓶颈来自三方面：

- Overdraw（过度绘制）：3DGS 的高斯点本质是透明元素，大量叠加需反复混合像素，导致渲染效率下降。但有研究（如《When Gaussian Meets Surfel》）通过 “不透明网格 + 高斯点” 混合渲染缓解 —— 先用网格渲染物体主体（减少透明混合），再用高斯点补充细节（如毛发、布料褶皱）。

- 带宽压力：3DGS 的高斯点参数（位置、协方差、颜色等）数据量庞大，移动端带宽难以支撑。虽有《LightGaussian》《EAGLES》等论文探索压缩方案（如参数简化、量化），但相比成熟的贴图压缩规范（ETC/ASTC/PVRTC），在压缩率与画质保留上仍有差距。另外 LOD 是一种减轻带宽压力的好方式，如《Virtualized 3D Gaussians》通过 “虚拟高斯点” 动态加载解决这一问题，但目前实现复杂度较高。

短期内，3DGS 在游戏中的效率优势难以显现，更适合 “效率不构成核心瓶颈” 的场景（如主机 / PC 端的小场景）。

### 2.2.2 灯光瓶颈：动态光影支持不足

游戏需要动态光影（如昼夜变化、角色移动带来的阴影变化），依赖阴影、全局光照（GI）、基于物理的渲染（PBR）等技术实时更新画面。但 3DGS 本质是 “静态光场记录”—— 它捕捉的是某一时刻的光照效果，难以直接支持动态打光。

现有研究（如《GS-IR》）尝试通过高斯点的颜色分布反向推导光照信息（如光源位置、强度），但精度与实时性不足，仅能实现简单的光照调整。

因此，3DGS 的初级应用场景更适合 “光线固定或简单” 的游戏。


### 2.2.3 物理瓶颈：物理交互适配难题

游戏中的物理交互（如碰撞检测、物体形变）依赖对物体形态的精确描述。3DGS 用高斯点云表示物体，若直接用基本几何体拟合碰撞体积，易出现穿模，破坏沉浸感。

用传统几何分解算法如 CoACD 为高斯点云生成网格碰撞体自然也是可以。但是，会不会有更高效更沉浸式的方式？

比如《VR-Doh》将 MPM 与 3DGS 结合，实现布料、液体的动态形变。
但仍然计算成本高。

短期内，3DGS 还是更适合搭配传统刚体引擎（如 PhysX）实现基础物理交互。

## 2.3 混合渲染管线中 3DGS 的应用机会

在 3DGS 的时代全面到来之前，若采用 “网格 + 3DGS” 的混合管线，或许可以让 3DGS 的优势可得到充分发挥，并能完成一些商业化。具体而言，3DGS 在以下领域具备 “弯道超车” 潜力：

### 2.3.1 AIGC 适配性

3DGS 的可微渲染特性使其天然适合作为 AIGC 的中间载体 —— 例如，AI 模型可直接通过调整高斯参数生成 3D 资产，而网格模型的拓扑结构难以通过微分优化。此外，3DGS 的训练数据获取更便捷（任意扫描模型均可转换为高斯点云），数据量的扩充将加速 3D AIGC 模型的迭代。  

因此，重 3DAIGC 的游戏，或许直接使用 3DGS 更加方便？

### 2.3.2 复杂几何的高效表示

网格模型在硬表面物体（如建筑、机械）上效率极高，但面对植被、云雾等复杂形态时存在局限：

植被的枝叶层次用网格模拟需大量三角形，且难以表现自然随机性；3DGS 可通过高斯点的密度分布轻松还原叶片的重叠与透光效果。

云雾用光线步进（raymarching）渲染效率低，3DGS 通过高斯点的透明度叠加或许可实现更高效的体积感表现。

### 2.3.3 高保真捕捉与实时还原

3DGS 能捕捉更高维度的真实信息，且可烘焙为实时资产：

真人影游场景中，3DGS 可直接捕捉演员的微表情与肢体细节（如《GaussianAvatars》《LAM》《SqueezeMe》的技术），烘焙后实现实时渲染，比传统动捕 + 骨骼动画更真实。

影视级高精度资产（如复杂材质的道具、超写实场景）因算力限制难以实时渲染，3DGS 可将其烘焙为轻量化高斯点云，在保证画质的同时满足游戏实时性。

# 3. 总结

3DGS 作为一类光场渲染技术，正深刻影响视觉内容创作领域，尤其在影视与游戏行业展现出显著潜力与现实挑战。

在影视领域，3DGS 有望重构传统制作流程。而在在游戏领域，3DGS 凭借成本与效率优势，成为实体化空间场景的重要新型表示方式，为游戏创作提供了 “弯道超车” 的潜力。

总体而言，3DGS 并非对现有技术的完全替代，而是通过与传统技术的融合与互补，推动视觉内容创作向更高效、更沉浸的方向演进，其长期价值将随技术瓶颈的突破逐步释放。

### 参考文献

Qu, Yansong, et al. "Drag your gaussian: Effective drag-based editing with score distillation for 3d gaussian splatting." Proceedings of the Special Interest Group on Computer Graphics and Interactive Techniques Conference Conference Papers. 2025.

Bartrum, Edward, et al. "ReplaceAnything3D: Text-Guided Object Replacement in 3D Scenes with Compositional Scene Representations." Advances in Neural Information Processing Systems 37 (2024): 48568-48598.

Bruce, Jake, et al. "Genie: Generative interactive environments." Forty-first International Conference on Machine Learning. 2024.

Ye, Keyang, Tianjia Shao, and Kun Zhou. "When Gaussian Meets Surfel: Ultra-fast High-fidelity Radiance Field Rendering." ACM Transactions on Graphics (TOG) 44.4 (2025): 1-15.

Fan, Zhiwen, et al. "Lightgaussian: Unbounded 3d gaussian compression with 15x reduction and 200+ fps." Advances in neural information processing systems 37 (2024): 140138-140158.

Girish, Sharath, Kamal Gupta, and Abhinav Shrivastava. "Eagles: Efficient accelerated 3d gaussians with lightweight encodings." European Conference on Computer Vision. Cham: Springer Nature Switzerland, 2024.

Yang, Xijie, et al. "Virtualized 3D Gaussians: Flexible Cluster-based Level-of-Detail System for Real-Time Rendering of Composed Scenes." Proceedings of the Special Interest Group on Computer Graphics and Interactive Techniques Conference Conference Papers. 2025.

Liang, Zhihao, et al. "Gs-ir: 3d gaussian splatting for inverse rendering." Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition. 2024.

Luo, Zhaofeng, et al. "VR-Doh: Hands-on 3D Modeling in Virtual Reality." ACM Transactions on Graphics (TOG) 44.4 (2025): 1-12.

Qian, Shenhan, et al. "Gaussianavatars: Photorealistic head avatars with rigged 3d gaussians." Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition. 2024.

He, Yisheng, et al. "LAM: Large Avatar Model for One-shot Animatable Gaussian Head." Proceedings of the Special Interest Group on Computer Graphics and Interactive Techniques Conference Conference Papers. 2025.

Wei, Xinyue, et al. "Approximate convex decomposition for 3d meshes with collision-aware concavity and tree search." ACM Transactions on Graphics (TOG) 41.4 (2022): 1-18.

Iandola, Forrest, et al. "SqueezeMe: Mobile-Ready Distillation of Gaussian Full-Body Avatars." Proceedings of the Special Interest Group on Computer Graphics and Interactive Techniques Conference Conference Papers. 2025.

[Unity-VR-Gaussian-Splatting](https://github.com/ninjamode/Unity-VR-Gaussian-Splatting)