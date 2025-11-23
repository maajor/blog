---
title: The Physics and Artistic Expression of Game Destruction | 游戏破坏的物理与艺术表现
date: 2025-11-23 00:00:00
tags:
  - Tech Review
  - Game Development
  - Physics
---


讨论“游戏”和“物理”的关系时，笔者更愿意这样比喻：学术界所理解的物理模拟是交响乐团的总谱，而游戏呈现出来的，只是一段为手机铃声剪辑过的旋律。游戏并不是把现实物理完整搬进屏幕，而是从中择取、删改、甚至故意违背，只保留那些最能服务玩法和表现力的部分。

以“破坏效果”为例，就是一个很典型的场景：一方面，游戏中的破坏并不需要高度物理真实；另一方面，只靠“物理真实”本身，也做不出足够好看的游戏破坏效果。优秀的破坏系统，往往是“物理 + 美术指导”的综合产物。

# Control **预制碎片与层次化破坏**

<div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start;">
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(1).jpg" alt="Control Steam 封面" style="display: block; width: 100%; height: auto;">
    <figcaption style="margin-top: 6px; color: #666; text-align: center;">Control Steam 封面</figcaption>
  </figure>
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(2).jpg" alt="Control 截图" style="display: block; width: 100%; height: auto;">
    <figcaption style="margin-top: 6px; color: #666; text-align: center;">Control 截图</figcaption>
  </figure>
</div>


《Control》是 Remedy Entertainment 打造的一款超自然题材动作冒险游戏，其备受赞誉的一大原因，就是把“探索、超能力战斗”和“环境破坏”紧密结合在了一起。环境本身不仅是背景，还是真正参与到战斗和交互中的“主角”。

游戏中几乎所有物体都可以被破坏：墙壁、地板、家具、书籍等，都能在念力或枪火下被撕裂、打碎、炸飞。爆炸与碎屑的反馈极其丰富，给人一种“这栋楼真的是实体”的错觉。

在 GDC 2020 的分享《Destructible Environments in “Control” – Lessons in Procedural Destruction》中，开发团队详细介绍了这套破坏系统的设计思路与实现流程。他们将破坏效果分成四个视觉层级：

1. **物体层级**：完整物体，如桌子、栏杆、扶手等。
2. **碎块（Chunk）层级**：较大的碎块，如混凝土块、木板残片等。
3. **碎屑层级**：更细小的碎片、残渣。
4. **灰尘层级**：尘烟、烟雾等体积感粉尘效果。

<div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start;">
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(3).jpg" style="display: block; width: 100%; height: auto;">
  </figure>
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(4).jpg" style="display: block; width: 100%; height: auto;">
  </figure>
</div>



除了“碎片本身”的层级划分，每个可破坏道具内部还预设了多个“损坏阶段”。也就是说，同一个物体在被打烂之前，会经历数个不同的视觉形态：轻微破损、局部塌陷、大面积剥落，最后才是完全粉碎。玩家在战斗过程中，会不断看到道具处在这些中间状态，而不是“完好”和“爆炸消失”这两种极端。

![损坏阶段](/images/destruction_image_(5).jpg)

从技术实现上看，《Control》的方案其实相当传统：偏向预制碎块的破坏模型。开发时，每个可破坏道具都预先生成碎片模型，在被击中或受力达到阈值后，用碎片模型替换原模型，再附加刚体物理模拟与粒子特效。前两个层级（物体和大块碎片）主要依赖刚体模拟，使用的是 PhysX 物理引擎；更细小的碎屑与灰尘，则通过粒子系统、材质 Decal 等传统引擎特性来表现。技术本身并不“黑魔法”，但配合一整套严格的视觉设计准则，反而极大提升了破坏的真实感。这种思路在《战地》系列等游戏中也被广泛采用。

如果要说技术层面上的创新，一是碎片的程序化生成。开发者基于 Houdini 搭建了一套破坏资产自动生成流程：美术只需制作完整的墙体、桌椅等道具，工具就能自动生成对应的破坏后视觉几何和物理碰撞几何，极大提高了制作效率。二是粒子的物理碰撞使用了屏幕空间 SDF 作为场景碰撞体，既提升了性能，又保持了足够拟真的碰撞反馈。

整体来看，《Control》的破坏系统属于在“既有物理框架”内的工程与美术创新，而不是依赖最新、最复杂的物理算法。真正关键的，是对视觉层级、破坏阶段和制作流程的一整套“艺术化规范”。

# Instruments of Destruction **模块化建筑与规则驱动坍塌**

<div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start;">
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(6).jpg" alt="Steam 封面" style="display: block; width: 100%; height: auto;">
    <figcaption style="margin-top: 6px; color: #666; text-align: center;">Steam 封面</figcaption>
  </figure>
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(7).jpg" alt="截图" style="display: block; width: 100%; height: auto;">
    <figcaption style="margin-top: 6px; color: #666; text-align: center;">截图</figcaption>
  </figure>
</div>

《Instruments of Destruction》是一款“物理破坏为核心”的沙盒建造与解谜游戏。玩家可以自由组装各类工程载具：推土机、拆楼车、无人机等等。关卡目标通常是利用自制机器摧毁特定建筑，或者通过巧妙破坏达成任务条件。

这款游戏的建筑破坏非常细致：结构会按照受力变化发生弯曲、断裂、连锁坍塌。每一次破坏过程都由实时模拟驱动，而不是单纯的预制动画。碎片飞散、残骸堆积与环境响应，共同营造出“施工现场级别”的物理混乱感。

<div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start;">
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(8).jpg" alt="这个房子有 561 个 blocks，1312 个 links" style="display: block; width: 100%; height: auto;">
    <figcaption style="margin-top: 6px; color: #666; text-align: center;">这个房子有 561 个 blocks，1312 个 links</figcaption>
  </figure>
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(9).jpg" alt="这个灯有 12 个 Block" style="display: block; width: 100%; height: auto;">
    <figcaption style="margin-top: 6px; color: #666; text-align: center;">这个灯有 12 个 Block</figcaption>
  </figure>
</div>

游戏中的建筑几乎全部由模块化方块拼装而成，各模块之间通过 Joint 连接构成整体结构。按材质划分，模块只有五个大类：混凝土（Concrete）、钢铁（Steel）、石材（Rock）、木材（Wood）、玻璃（Glass），每种材质再区分不同体积规格。每个模块拥有不同的 HP（耐久度）和对应的破坏表现：受到打击时 HP 降低并发生形变，当 HP 归零后，模块会消失并转化为碎块或更小的模块。

更大的模块在被破坏时，会二分、四分甚至八分，替换为更小的模块。这套规则叠加起来，形成了一个“程序化破坏系统”：从远处看是整栋楼塌陷，从技术上看则是成百上千个带 HP 的积木在被拆解和重组。

![破坏层级](/images/destruction_image_(10).jpg)

除了单个模块的破坏表现外，游戏对“整体坍塌”的处理也有独特之处：当一些模块脱落后，系统会检测各个“层级”是否存在异常脆弱区域（需要支撑的质量巨大而 HP 又偏低）。如果判断为脆弱层，就对这一层追加伤害，并给上下相邻层附加少量随机伤害，然后过一小段时间再进行同样的检测。绝大多数情况下，这将逐步引导整栋建筑崩塌；但偶尔，当足够多的部分提前脱落减轻了负载，结构也可能“险而不倒”。熟悉《Red Faction: Guerrilla》的玩家应该会觉得似曾相识——这并不是巧合，《Instruments of Destruction》的开发者此前确实参与过《Red Faction: Guerrilla》的开发。

值得注意的是，这一切并没有依赖前沿的物理技术：游戏用的是 Unity 2019 搭配 PhysX，没有 ECS，也没有 Jobs。看上去“高拟真”的破坏，实际上是相对简单的物理模拟，加上一套精心设计的规则系统和强烈的艺术指导。

# BeamNG & RigsOfRods **载具软体模拟的局限性**

<div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start;">
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(11).jpg" alt="BeamNG Steam 封面" style="display: block; width: 100%; height: auto;">
    <figcaption style="margin-top: 6px; color: #666; text-align: center;">BeamNG Steam 封面</figcaption>
  </figure>
  <figure style="flex: 1 1 320px; margin: 0;">
    <img src="/images/destruction_image_(12).jpg" alt="RigsOfRods Github 封面" style="display: block; width: 100%; height: auto;">
    <figcaption style="margin-top: 6px; color: #666; text-align: center;">RigsOfRods Github 封面</figcaption>
  </figure>
</div>

《BeamNG.drive》是一款以真实汽车物理和车辆破坏著称的沙盒驾驶游戏。其标志性的“软体物理（soft-body physics）”引擎，将每辆车视作由大量节点和梁相连的弹性骨架，用于模拟车身刚度、质量分布与连接特性。当车辆行驶、碰撞或受力时，梁会弯曲或断裂，节点随之位移，整个系统产生持续变形。伤害不仅体现在车壳形变上，还会渗透到机械结构、悬挂系统、轮胎和其他机械部件的损坏逻辑中。

Rigs of Rods 则是一个更早期的开源软体物理模拟器，最早可追溯到 2005 年。BeamNG 的开发者最初正是参与 Rigs of Rods 的那批人，因此在技术原理上，两者有着高度相似的血缘关系。通过研究 Rigs of Rods 的代码，也能部分窥见 BeamNG 的核心思想。

![image.jpg](/images/destruction_image_(13).jpg)

## **“原始”算法与复杂业务**

从算法角度看，这套载具物理其实非常“朴素”：本质上是一套带弹簧的质点系统（Spring-Mass System），使用显式欧拉积分配合惩罚函数；既不是 PBD（Position Based Dynamics），也不是隐式或半隐式求解。真正复杂的是业务层面的建模：轮胎、悬挂、传动系统、浮力装置、梁结构等子系统，并不是被统一建模为“一堆弹簧和质量”，而是各自拥有特定的几何与物理特性。也因此，代码逻辑极其庞杂，充满了高度领域专用（domain-specific）的处理。

在 Rigs of Rods 源码中，可以看到类似 **`ActorManager::UpdatePhysicsSimulation()`** 这样的物理迭代入口，进一步进入 **`Actor::CalcForcesEulerCompute`** 会依次调用各种子系统的力计算与状态更新：节点位置更新、包围盒计算、事件触发、浮力、轮胎、减震、液压、命令系统、发动机、碰撞检测、力反馈等等。乍看之下，这更像一套复杂的“工程仿真脚本”而不是教科书式物理引擎。然而，正是这种极度业务导向、反复迭代打磨的系统，在“载具”这个具体场景中展现出了惊人的表现力。

```markdown
void Actor::CalcForcesEulerCompute(bool doUpdate, int num_steps)
{
    this->CalcNodes(); // must be done directly after the inter truck collisions are handled
    this->UpdateBoundingBoxes();
    this->CalcEventBoxes();
    this->CalcReplay();
    this->CalcAircraftForces(doUpdate);
    this->CalcFuseDrag();
    this->CalcBuoyance(doUpdate);
    this->CalcDifferentials();
    this->CalcWheels(doUpdate, num_steps);
    this->CalcShocks(doUpdate, num_steps);
    this->CalcHydros();
    this->CalcCommands(doUpdate);
    this->CalcTies();
    this->CalcTruckEngine(doUpdate); // must be done after the commands / engine triggers are updated
    this->CalcMouse();
    this->CalcBeams(doUpdate);
    this->CalcCabCollisions();
    this->updateSlideNodeForces(PHYSICS_DT); // must be done after the contacters are updated
    this->CalcForceFeedback(doUpdate);
}
```

## **美术瓶颈与扩展空间**

虽然 BeamNG 在车辆形变和碰撞还原方面已经达到了近乎“实验室级”效果，但在总体视觉表现上，仍然存在一些明显短板。其破坏反馈大多集中在刚体和粒子层面，缺少纹理层面的细节表现。比如，很多玩家希望能看到更丰富的划痕、剐蹭、脱漆等贴图 Decal 效果，而不仅仅是车壳几何上的凹陷与扭曲。

同时，碎片与残骸的粒子效果也有提升空间。如果借鉴《Control》那种多层级破坏和碎屑分类方式，引入更丰富的块级碎片、细碎屑与灰尘层次，整体观感会更具“质感”。已有一些案例证明了这一点，例如 Studio Tatsu 的“Vehicle Damage System”：在软体物理的基础上叠加更精细的视觉破坏表现，可以显著提升“撞上去很好看”的体验。

换言之，BeamNG 在“物理真实”维度已经做到极致，但在“艺术化破坏演出”层面仍有较大空间。如果能在现有软体系统之上叠加一套类似游戏 VFX 的视觉层级系统，其整体观感会比现在更接近一款“游戏产品”，而不是“物理实验软件”。

# Teardown **体素破坏中的艺术表现**

《Teardown》是一款以“完全可破坏环境”为核心卖点的沙盒潜行与解谜游戏。其最大特色在于：采用体素（Voxel）技术搭建整个世界，几乎所有东西都可以被破坏。每一关的设计都围绕“如何利用破坏达成目标”展开：玩家要自己规划路线、布置炸药、改造环境，策划并执行一次“完美盗窃”或精确破坏任务。关卡的真正解法，往往是玩家亲手“炸”出来的。

![image.jpg](/images/destruction_image_(14).jpg)

游戏的物理引擎几乎完全出自开发者 Dennis Gustafsson 个人之手。与许多依赖商用引擎的作品不同，《Teardown》在物理与几何表示上的创新程度相当高：底层仍然是冲量方法和高斯–赛德尔（Gaussian–Seidel）迭代求解的刚体系统，但所有场景与物体并不是用传统多边形网格，而是体素栅格来表示。这套方案源于开发者长年在实时物理领域的积累，他早年就参与过 PhysX 的研发，对“物理 + 体素”的组合有极深的实践经验。

在其“Teardown Engine Technical Dive”等技术分享中，Dennis 对体素物理引擎的实现方式有过较多介绍：体素世界的碰撞检测、刚体分解与合并、重建可见体、体素与传统渲染管线的结合等等。不过，即便是这样“硬核”的引擎，《Teardown》内部也并没有上马诸如有限元分析一类昂贵的模拟方案。因此在游戏中常能看到一些“物理上怪异”的情况，比如几颗细小体素居然能支撑起整栋楼房。

![image.jpg](/images/destruction_image_(15).jpg)

## 艺术导向的破坏规则

即便存在这些“物理漏洞”，《Teardown》的破坏依然给人一种怪诞却可信的真实感。原因在于：其破坏效果很大程度上由“艺术规则”而非“纯物理”主导。下面是几种典型的表现模式（基于观察与推断，并非官方文档）：

### 1. 接触面清空

在软质物体高速撞击坚硬地面时，接触区域附近的体素会被快速“清空”。例如当高楼快速倒向地面时，底部与地面的接触层好像被削去一截。严格来说，这显然不符合物理定律——物质似乎凭空消失了。但从观感上，这种“削切”会极大增强坠落的重量感，强化“砸穿地面”的视觉印象。

![image.jpg](/images/destruction_image_(16).jpg)

### 2. 局部爆裂式破碎

建筑倒地过程中，部分与地面接触的区域会在接触点周围大范围碎裂成小块。这很难用真实应力传导来解释，却在视觉上非常有冲击力：接触点不仅仅是“压扁”，而是“炸裂”，仿佛混凝土在巨大冲击下瞬间粉碎。这样的规则在物理上未必严谨，但在视觉叙事上极有效。

![image.jpg](/images/destruction_image_(17).jpg)

### 3. 随机剥落与空洞

在整体坍塌过程中，一些悬空部分会随机产生破洞与掉块。从物理角度可以勉强解释为“局部构件承受不了速度和加速度”，但实际上，其实现明显更偏向一种随机、艺术化的剥落逻辑。这种不规则的残缺，使坍塌后的建筑显得更“自然”，也更符合玩家对废墟的刻板印象。

![image.jpg](/images/destruction_image_(18).jpg)

从这几种模式可以看出，《Teardown》的破坏系统远不是对物理法则的逐字抄写，而是大量使用“看起来像物理”的艺术化规则——在保留足够多物理直觉的前提下，牺牲精确性，换取更强的表现力和更稳定的性能预算。

# 总结

回顾上述游戏，可以看到一个共同的结论：**好看的破坏和好玩的物理，从来不是“物理越真实越好”，而是“物理真实 + 艺术规则 + 玩法需求”的平衡产物。**《Control》用层次化预制碎片和程序化工具，把传统刚体物理包装成极具观感的超能力破坏；《Instruments of Destruction》用简单的方块、HP 和坍塌判定逻辑，在 Unity + PhysX 的框架下，构筑出富有策略性的拆楼乐趣；BeamNG 在车辆软体物理上走向极致，却仍然需要更多美术与特效去弥合“物理模拟”与“游戏表现”的落差；《Teardown》则干脆把物理引擎当成美术工具，通过体素和一套不那么正统的破坏规则，让“物理”彻底融入关卡设计与玩家创造。也因此，把物理引擎当作一部完整的交响乐，而把游戏里的物理视为剪辑后、重混过的手机铃声，或许更符合现实：游戏设计的核心并非复制世界，而是挑选、删改、重编那些最能服务体验的“物理片段”。

参考资料

[Fully Destructive Environments In Gaming [Future Of Games 2/6]](https://www.youtube.com/watch?v=c_jvdDL8kzI&t=252s)

[Destructible Environments in Control: Lessons in Procedural Destruction](https://www.youtube.com/watch?v=kODJsQGXanU&t=210s)

[How Physics-based Destruction Works In Games | Instruments of Destruction (September 2024 DevLog) - YouTube](https://www.youtube.com/watch?v=lXRfgeJg3r4&t=221s&pp=ygUZYmF0dGxlZmllbGQgNiBkZXN0cnVjdGlvbg%3D%3D)

[How Games Do Destruction - YouTube](https://www.youtube.com/watch?v=JZ9GRFD-mSc&pp=ygUQZ2FtZSBkZXN0cnVjdGlvbg%3D%3D)

[[游戏中的破坏][GDC24]TheFinals的破坏系统 - 知乎](https://zhuanlan.zhihu.com/p/692442664)

[游戏破坏系统简介 - 知乎](https://zhuanlan.zhihu.com/p/346846195)

[为什么现在游戏几乎都做不到，建筑物场景可以破坏的效果?主要技术太难，还是因为这对游戏可玩性毫无作用? - 知乎](https://www.zhihu.com/question/591860429)

[Destructible Environments in Control: Lessons in Procedural Destruction](https://www.youtube.com/watch?v=kODJsQGXanU)

[Complete Technical Breakdown of the Physics+Destruction System in Instruments of Destruction. : r/Unity3D](https://www.reddit.com/r/Unity3D/comments/stzrfb/complete_technical_breakdown_of_the/)

[Scratch Decals? | BeamNG](https://www.beamng.com/threads/scratch-decals.34252/)

[Is it possible to have scratch damage? : r/BeamNG](https://www.reddit.com/r/BeamNG/comments/iq2u14/is_it_possible_to_have_scratch_damage/)

[Vehicle Damage System – Studio Tatsu](https://studiotatsu.com/game-dev/vehicle-damage-system/)

[RigsOfRods/rigs-of-rods](https://github.com/RigsOfRods/rigs-of-rods)

[Oldschool Car Damage System - Devlog 4](https://www.youtube.com/watch?v=UhgDqx4a2E8&t=1s)  damage texture

[Teardown Engine Technical Dive [Stream Archive]](https://www.youtube.com/watch?v=tZP7vQKqrl8&t=5415s&pp=ygUXdGVhcmRvd24gdGVjaG5pY2FsIGRpdmU%3D)
