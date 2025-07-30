---
title: Some Random Thought on PhysX | PhysX 的一些随想
date: 2024-11-24 00:00:00
tags:
  - Physics
  - Tech Review
---

# 1. 物理引擎的现状

在游戏开发领域，就我们狭义上所认知的游戏引擎所采用的物理引擎主要有两个。其一是 Havok，该物理引擎为闭源性质，被许多内部开发的游戏引擎所运用。另一个则是 PhysX，它是 Unity 和 UE4 这两款主流游戏引擎的默认物理引擎。

再看 Bullet，它近期的更新频率极低，查看其更新日志可知，更新主要是出于强化学习、机器人以及具身智能等方面的需求。而在这个领域中，Nvidia/PhysX 似乎占据着主流地位，Bullet 的发展态势已大不如前，其前景似乎有些黯淡。

我曾在某厂有过接触 Havok 的机会，不过那时我资历尚浅，在物理开发方面几乎未曾深入涉足。直至近期开始钻研 PhysX，才对物理引擎有了更为透彻的认识与理解。

然而，若从广义的角度来界定物理引擎，其种类就颇为丰富多样了。例如 MagicaCloth，它是否可被纳入物理引擎的范畴呢？还有 DynamicBone 以及 Obi，它们又能否算作物理引擎呢？在我看来，答案是肯定的。只要某个系统具备物理模拟的功能，包含弹簧质点的模拟机制以及碰撞处理的能力，那么它就应当被视作物理系统，即广义上的物理引擎。

但令人感到疑惑的是，在实际应用中，大家往往更倾向于选择使用 DynamicBone 和 MagicaCloth，而不是功能同样强大的 PhysX。实际上，PhysX 完全具备模拟弹簧质点的能力，并且它还支持多线程处理，在性能和功能上都有出色表现。那为何会出现这种情况呢？或许这主要是由于开发者的心智负担所导致的。毕竟，对于一些简单的应用场景而言，较为简易的方案可能更易于操作与实施，虽然 PhysX 功能强大，但在某些简单需求下，其复杂性可能反而成为了一种 “劣势”，使得简单方案更受青睐，从而拥有特定的应用场景与市场需求。

# 2. PhysX 的版本更替

首先，对 PhysX 的背景进行介绍是十分必要的。从其代码当中，我们能够清晰地看到历史发展所留下的痕迹。

```
// Copyright (c) 2008-2024 NVIDIA Corporation. All rights reserved.
// Copyright (c) 2004-2008 AGEIA Technologies, Inc. All rights reserved.
// Copyright (c) 2001-2004 NovodeX AG. All rights reserved.
```

追溯到 2001 年，PhysX 的第一行代码诞生于瑞士苏黎世。极有可能是 ETH 的教授创立了 NovodeX AG 这家公司，并开启了物理 SDK 的开发工作。

到了 2004 年，AGEIA 对 NovodeX 进行了收购，随后将这个物理引擎更名为 PhysX。AGEIA 是一家成立于 2002 年的半导体设计公司（fabless）。该公司推出了一款专门用于物理计算的硬件单元 ——Physics Processing Unit (PPU)，这是一种特殊的 PC 硬件，其主要用途是进行游戏物理模拟。不难推测，AGEIA 公司做出收购决策，很可能是为了丰富自身产品的生态体系。要知道，2002 年正值 DX9 发布之际，自那时起，众多游戏开发迈入了一个全新的时代，物理引擎在当时或许正处于发展的风口浪尖。

在 2008 年，NVidia 收购了 AGEIA，同样也是出于丰富自家产品生态的考量，在 Geforce 显卡上启用了 PhysX。

Unity 早在 2005 年就已经集成了 PhysX。在 2015 年 Unity 5 发布时，所采用的是 PhysX 3。并且在 Unity 2019.3 版本中，将其升级到了 PhysX 4.1。

关于 PhysX 自身的版本更替历史，从 V3.0 版本起，在其 [CHANGELOG.md](https://github.com/NVIDIA-Omniverse/PhysX/blob/main/physx/CHANGELOG.md) 中有非常详尽的记录，这一版本也是由 Nvidia 重新编写的。

具体而言，PhysX 3 实现了多线程模拟，这使得其运算速度有了极大的提升；PhysX 4 添加了 ABP 实现和 TGS 解算器；PhysX 5.1 添加了自定义几何体、全新的 Vehicle SDK 和软体系统；PhysX 5.2 添加了 CUDA 模拟支持。

然而，仔细探究后会发现，PhysX 的 GPU 实现并未开源，仅仅提供了 Binary。并且，PhysX 5 新增的 FEM 软体和 PBD 粒子，只能在 CUDA 环境下使用。这实在令人感到困惑。

如此看来，除了最初由 ETH 开展的技术创业之外，PhysX 在后续的每次升级似乎都与相关公司的战略商业行为紧密相连。

那么，是否有必要将 PhysX 升级到 5 版本呢？从目前的情况来看，除非是为了使用 CustomGeometry 或者 Vehicle API，否则似乎并没有太大的必要。毕竟，在很多发布平台上，CUDA 的应用并不广泛。再进一步思考，Unity 是否有足够的动力去升级 PhysX 5 呢？答案似乎是否定的。因为 CustomGeometry 在 API 暴露方面不太容易，而 Vehicle API 在 Unity 中的应用此前几乎可以说是形同虚设。

# 3. Unity 怎么做的 PhysX 套壳

笔者在深入实践与探究后才发现，Unity 针对 PhysX 的默认特性实施了一系列调整与优化，旨在提升游戏开发者的使用体验与便利性。具体表现如下：

- 在 PhysX 体系中，多数情况下不存在缩放参数。为使 Unity 场景树中的物体能够达成与 PhysX 等效的行为模式，开发者必须自行进行所有缩放相关的计算，包括几何体的尺寸、关节锚点等参数的缩放处理。鉴于缩放功能在游戏开发进程中具有极为关键的地位，此步骤不可或缺。
- PhysX 未构建场景树结构，其所有场景物体处于平级状态。因而，在诸多情形下，相关的相对位姿信息需要在 Unity 环境中预先完成精确计算，其中以 PxD6Joint（对应 Unity 的 ConfigurableJoint）的计算过程最为复杂繁琐。由于场景树结构在游戏开发实践里意义重大，这一操作成为必然。
- PhysX 中碰撞 Layer 只有按 Actor 级别的，而 Unity 中是以 Collider （PxShape）级别的。甚至对 Collider 和可以有附加的 Include/Exclude Layer，区分更为精细。这对于游戏开发很重要。
- 在 OnCollisionXXX 事件中，Collision 参数会提供一个 relativeVelocity 参数。需注意的是，该速度并非碰撞解算后的最终速度，而是对应于 PhysX 中的 ePreSolverVelocity，且需手动添加特定 flag 才会在默认情况下呈现。此行为大概率是基于游戏开发需求所设定，其目的在于将该参数作为衡量碰撞力度的一个维度。毕竟，impulse 仅仅是通过几何方式求解得出的结果。
- PxRevolutionJoint（对应 Unity 的 HingeJoint）竟然未配备 targetPosition 功能，推测这是 Unity 自行改造后实现的特性。从游戏开发需求的角度来看，ConfigrableJoint 具备 targetPosition 功能，而 HingeJoint 却缺失，这一差异值得关注。
- 对于 Unity 的 Raycast 功能，若射线检测起始于基本几何体内部，Unity 不会将该基本几何体视作碰撞结果，然而 PhysX 的默认设置则会将其纳入。这种差异可能是基于游戏开发特定需求而产生，尽管从纯粹物理原理角度审视，它或许并不完全符合物理规律。
- Unity 的 PxTolerance 参数表现出相对固定的特性，然而依据相关文档，PxTolerance 的速度项理应与重力大小存在关联。但在实际应用中，大概率是由于开发者关注度较低，此关联未得到充分体现与应用。
- 在 Unity 的 ConfigurableJoint 中，AngularLimit 仅实现了与 PhysX 对应的 ConeLimit，而未对新的 PyramidLimit 加以实现。这一情况大概率是由于在实际游戏开发场景中，对此功能的需求较低，开发者较少关注所致。

由此可见，游戏开发的业务场景与原始的 SDK 之间存在着显著的差异与距离，能够在二者之间构建有效的套壳机制并实现功能适配，无疑是一种值得重视与认可的能力体现。

# 4. Nvidia 的战略对 PhysX 的影响

从 PhysX 未开源 GPU 部分这一现象出发，可猜测 Nvidia 的战略意图。其将 CPU 部分开源，而对 GPU 部分予以保留，显然旨在形成市场垄断格局，以此驱动用户向其 NV GPU 产品进行升级。

NV 主要聚焦于桌面端、服务器以及超算中心领域的 GPU 业务，而在移动端 GPU 市场涉足较少。在其重点布局的领域中，GPU 物理引擎对于强化学习及具身智能训练有着极为关键的作用，PhysX 的发展走向亦着重于此方向，特别是在数字孪生领域有着重要应用前景。

然而，对于移动端与主机端的物理模拟状况而言，当前鲜少有仅支持 PC 平台且强制要求 NV 显卡的游戏。移动端显卡主要由高通、Mali 以及 M 系列占据主导，在该领域功耗因素至关重要，虽将物理模拟置于 GPU 可提升运算速度，但可能导致功耗增大，这显然并非 Nvidia 的战略侧重点。由此引发疑问，游戏中的物理引擎是否会逐渐与 PhysX 走向不同的发展路径？

当前，UE 自主研发 Chaos Physics，Unity 也在构建自身的物理系统。在纯刚体物理引擎领域，PhysX 4 已处于较高水准，若新的物理引擎缺乏如 PBD/FEM 等更先进的技术以及复杂破坏、软体模拟等功能，便无充足理由进行替换。从这一视角审视，UE 的 Chaos Physics 战略具有合理性。而对于 Unity Physics，其基于 ECS 架构，但其能否在性能上超越 PhysX 仍存疑，毕竟二者均采用多线程技术，且 ECS 架构在逻辑编写方面的应用相对小众，其战略布局的有效性有待进一步观察。

受移动端硬件性能的限制，PhysX 在短期内仍将占据一定市场份额，其后续发展态势在硬件性能取得突破后仍有待观望。