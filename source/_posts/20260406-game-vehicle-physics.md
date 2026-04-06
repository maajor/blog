---
title: A Practical Guide to Game Vehicle Physics | 游戏车辆物理入门指南
date: 2026-04-06 00:00:00
tags:
  - Tech Review
  - Game Development
  - Physics
---

*作者按: 本文包含部分 AI 创作的内容，仅作为个人观点*


如果你正在做一款赛车游戏，或者任何包含驾驶玩法的游戏，你会很快发现"让一辆车动起来"这件事远比想象中复杂。这不是"给刚体加个力让它往前跑"就能解决的——你需要处理悬挂、轮胎、传动系统、转向、空气动力学……每个环节都有自己的物理细节和工程取舍。

本文从最基础的问题出发——车身和车轮怎么连接？油门踩下去力是怎么传到地面的？——逐步展开游戏车辆物理的完整图景。我们会分析 Box2D、Bullet、PhysX、Unity WheelCollider 等引擎级方案，深入 VDrift、PhysX Vehicle2、TORCS 等开源项目的实际代码，最后看看 Forza、DiRT、GT 等商业大作是怎么做的。

# 1. 两个基本问题

不管你用哪个引擎、哪种方案，实现车辆物理本质上就是在回答两个问题：

1. **车身和车轮怎么连接？** 悬挂怎么模拟？车轮是独立刚体还是虚拟节点？
2. **油门踩下去，力是怎么传到地面的？** 引擎扭矩经过哪些环节最终让车前进？

不同方案对这两个问题的回答截然不同，也就决定了物理模拟的真实度和性能开销。

# 2. 车身与车轮的连接方式

实现车辆物理的第一个问题是：车身和车轮之间是什么关系？最直觉的答案是——把它们都做成刚体，用 Joint 连起来。这也确实是 2D 游戏的标准做法。但在 3D 世界中，事情没有那么简单。

## 2.1 刚体约束（Box2D / Havok）

这是最"物理正确"的直觉方案——车身和车轮都是独立的刚体，通过物理约束（Joint）连接，物理引擎负责处理所有的力传递。

### 2.1.1 Box2D b2WheelJoint（2D 经典方案）

Box2D 的 `b2WheelJoint` 是这种方案的典型实现，在 2D 赛车游戏中被广泛使用：

```cpp
b2WheelJointDef def;
def.Initialize(chassis, wheel, wheelAnchor, axis(0, 1));  // 垂直悬挂轴

// 悬挂弹簧参数
def.frequencyHz = 4.0f;      // 弹簧刚度（越大越硬）
def.dampingRatio = 0.7f;     // 阻尼比（0=无阻尼，1=临界阻尼）

// 驱动电机
def.enableMotor = true;
def.maxMotorTorque = 20.0f;  // 最大电机扭矩
def.motorSpeed = 0.0f;       // 目标转速（rad/s）

world->CreateJoint(&def);
```

驱动方式很简单：通过 Joint 的电机系统设置目标转速和最大扭矩，约束求解器自动处理力传递——电机驱动车轮旋转，车轮与地面摩擦产生前进力，车身在前进力作用下移动。你不需要手动计算任何力，物理引擎全包了。

### 2.1.2 Havok / 通用 3D 物理引擎（3D 方案）

在 3D 中，同样的思路用 HingeConstraint 或 D6Constraint 实现：车轮是真实的碰撞体，通过约束连接到车身刚体上。引擎的碰撞检测和约束求解器负责处理车轮与地面的接触，以及悬挂的弹簧-阻尼行为。

**代表作：** 塞尔达王国之泪（Havok Physics 拼装载具）、BeamNG.drive（以物理碰撞变形闻名的赛车模拟）。

### 2.1.3 刚体轮子的问题

在 2D 中，刚体方案工作得很好。但到了 3D，四个约束耦合在同一个车身刚体上，会暴露出几个严重的问题：

**数值稳定性。** 4 个悬挂弹簧约束同时作用在车身刚体上，互相耦合。物理引擎的约束求解器是迭代式的，4 个约束互相"抢"车身的质量和速度，非常难收敛。表现出来的就是车轮抖动、车身莫名振动、极端情况下（高处落下、碰撞障碍物）约束能量突然释放导致车辆"爆炸"。这不是某个引擎的 bug，而是所有通用约束求解器的固有问题——2D 少一个旋转自由度，问题还不明显；3D 多一个自由度，问题指数级恶化。

**无法精确控制轮胎力。** 刚体方案下，力的传递路径是：引擎扭矩 → Joint 电机 → 车轮旋转 → 地面碰撞 → 碰撞响应力 → 车身。中间经过碰撞检测和碰撞响应，这两步由引擎控制，你无法精确指定"这个轮子此时应该产生多少 N 的纵向摩擦力"。你只能间接影响（通过摩擦系数、质量等参数），但最终结果取决于 solver 怎么解。而赛车游戏的核心需求——漂移、打滑、抓地力的手感——全靠对轮胎力的精确调控。刚体方案下做不到这一点。

**需要极高的物理更新频率。** 车轮是高速旋转的圆柱体，接触点处的线速度 = 角速度 × 半径。一辆时速 200km/h 的车，轮胎线速度约 55m/s，在 60fps 下每帧移动 0.9m——已经超过轮胎接触斑的尺寸了。物理引擎必须用很高的子步频率才能稳定追踪车轮接触，否则会出现穿透和力的突变。

**性能开销。** 5 个刚体（1 车身 + 4 轮）的碰撞检测量远大于 1 个刚体。每帧需要 4 个碰撞形状 vs 场景所有碰撞体的 broadphase 检测，加上 4 个 narrowphase 碰撞检测和 4 个约束求解。对于开放世界多车场景，这个开销是乘以车辆数量的。

### 2.1.4 什么时候必须用刚体轮子？

虽然赛车游戏普遍回避这个方案，但在某些场景下它是唯一选择。

**拼装系统：** 塞尔达王国之泪允许玩家自由拼装载具，轮子可以装在任何位置、任何角度、任何数量。这种自由度下不可能用预设的 Raycast 方案，必须让每个轮子成为独立刚体参与物理模拟。代价是操控稳定性下降——你可能注意到了，王泪的载具经常抖动、歪斜、高速时翻车。这不是任天堂技术不行，而是刚体约束的固有限制。为了拼装自由度，他们接受了这些妥协。

**碰撞变形：** BeamNG.drive 的核心卖点是车身和车轮的碰撞变形。车轮必须是真实碰撞体才能参与软体物理变形。

### 2.1.5 适用场景总结

- ✅ 2D 赛车游戏（Box2D 稳定性可接受）
- ✅ 拼装系统、自由组装载具
- ✅ 碰撞变形是核心玩法的场景
- ❌ 追求精确操控手感的 3D 赛车游戏

## 2.2 Raycast Vehicle（Bullet / Godot / Unity）

这是 **3D 物理引擎的默认方案**，Bullet 的 `btRaycastVehicle`、Godot 的 `VehicleBody3D`、Unity 的 `WheelCollider` 都是这个思路。

核心思想：**车轮不是独立刚体**，只是虚拟的节点。每帧从车轮位置向下发射 Raycast 检测地面，用数学模型模拟悬挂。

```cpp
// Bullet btRaycastVehicle
btRaycastVehicle vehicle(tuning, chassisBody, raycaster);
vehicle.addWheel(connectionPoint, wheelDirection, wheelAxle,
                 suspensionRestLength, wheelRadius, tuning, isFrontWheel);

// 驱动：直接设置每个轮子的引擎力
vehicle.applyEngineForce(force, wheelIndex);  // 单位：牛顿(N)
```

**悬挂力计算（Bullet 内部）：**

```cpp
// btRaycastVehicle::updateSuspension()
btScalar force = stiffness * (restLength - currentLength)  // 弹簧力
               - damping * relativeVelocity;                // 阻尼力
suspensionForce = force * chassisMass;
```

**驱动力传递：** 引擎力不是传统意义上的"力"，而是被转换成冲量施加在车身接触点：

```cpp
// btRaycastVehicle::updateFriction()
rollingFriction = engineForce * deltaTime;  // 力 → 冲量
body->applyImpulse(forwardDir * rollingFriction, contactPoint);
```

冲量施加在车轮接触点（相对车身质心有偏移），同时产生前进力和扭矩。这也是为什么后驱车急加速时车头会抬起——力矩的自然结果。

**为什么 3D 引擎都用 Raycast 而非真实 Joint？**

- **性能：** 避免四个车轮刚体的碰撞检测开销
- **稳定性：** 多个 Joint 约束在 3D 中容易产生数值抖动
- **可控性：** 悬挂参数（刚度、阻尼）直接暴露，方便游戏手感调参

## 2.3 自定义约束（VDrift / PhysX / 商业游戏）

**VDrift** 的做法最具代表性：

```cpp
// wheelconstraint.h
struct WheelConstraint {
    DriveShaft * shaft;           // 车轮的旋转状态（1D，非独立刚体）
    ConstraintRow constraint[3];  // 3个约束行
    btVector3 position;           // 车轮在车身上的位置
    btScalar radius;

    // constraint[0]: 纵向（前进方向）— 轮胎摩擦力
    // constraint[1]: 横向（侧向）— 轮胎摩擦力
    // constraint[2]: 法向（垂直）— 悬挂弹簧 + 阻尼
};

// 悬挂求解 — 直接修改车身刚体速度（不走 Bullet 的约束求解器）
void solveSuspension(btRigidBody & body) {
    btScalar dp = constraint[2].solve(velocityError);
    body.setAngularVelocity(body.getAngularVelocity() + dw);
    body.setLinearVelocity(body.getLinearVelocity() + dv);
}
```

**PhysX Vehicle2** 更进一步——连车身都不是 `PxRigidBody`，而是完全独立的刚体状态：

```cpp
// VhRigidBodyFunctions.cpp
void PxVehicleRigidBodyUpdate(..., PxVehicleRigidBodyState& state) {
    // 1. 累加所有力：悬挂力 + 轮胎纵向力 + 轮胎横向力
    PxVec3 force = suspForce + tireLongForce + tireLatForce + gravity * mass;

    // 2. 自己做积分（不经过 PhysX 场景！）
    integrateBody(mass, moi, force, torque, dt, linvel, angvel, pose);
}
```

**为什么这么做？** 控制力。引擎的通用约束求解器是为一般物理场景设计的，不针对车辆场景优化。自定义约束可以：
- 用更高的子步频率（600-1000Hz）保证高速稳定性
- 精确控制力传递的顺序和方式
- 实现引擎内置 API 无法表达的物理行为（如限滑差速器、路面形变）

## 2.4 速度直接控制（Arcade 游戏）

```csharp
// Unity 中常见的 Arcade 做法（Mario Kart 克隆等）
rb.velocity = transform.forward * currentspeed;      // 直接赋值速度
transform.Rotate(0, steerAngle, 0, Space.Self);       // 直接旋转
rb.AddForce(transform.right * driftForce * dt);       // 飘移靠加侧向力
```

Rigidbody 在这里只用于碰撞检测和地面吸附，车辆运动完全由代码控制。对于卡丁车、跑酷类游戏这完全够用，但不适合需要真实驾驶手感的游戏。

## 2.5 四种方案对比

| 方案 | 车轮是刚体 | 用引擎 Joint | 力传递方式 | 适用场景 |
|------|-----------|------------|----------|---------|
| **刚体约束** | ✅ | ✅ | 引擎 solver 自动处理 | 2D 赛车、拼装系统、碰撞变形 |
| **Raycast Vehicle** | ❌ | ❌ | 冲量施加在接触点 | 3D 游戏快速原型 |
| **自定义约束** | ❌（1D 状态） | ❌ | 手动计算力，直接施加 | 硬核模拟 / 商业大作 |
| **速度控制** | ❌ | ❌ | 直接赋值 velocity | Arcade / 卡丁车 |

可以看到一个清晰的趋势：从方案一到方案四，对物理引擎的依赖越来越少，对力的控制越来越直接。赛车游戏的共识是——绕开刚体轮子，用其他方式模拟其行为，把轮胎力的控制权握在自己手里。选择哪种"绕开"的方式，取决于你对真实度和开发成本的取舍。

# 3. 油门驱动：力是如何传递的

## 3.1 简单方案：一步到位

Raycast Vehicle 的驱动最简单——一个 `applyEngineForce()` 搞定。内部直接把引擎力转换成冲量施加到车身，没有传动系统的概念。

## 3.2 完整传动链

所有严肃的赛车游戏都模拟了完整的传动系统。力的传递经过这条链路：

```
油门输入
  → 引擎（RPM → 扭矩曲线插值）
    → 离合器（打滑模型）
      → 变速箱（齿轮比）
        → 差速器（扭矩分配 + 限滑）
          → 车轮驱动扭矩
            → 车轮角速度变化
              → 轮胎滑移率变化
                → 轮胎力模型（纵向 + 横向）
                  → 车身力 + 扭矩
```

让我们逐步拆解每个环节。

### 3.2.1 引擎

引擎根据当前转速（RPM）和油门开度输出扭矩：

```cpp
// VDrift - carengine.cpp
btScalar CarEngine::GetTorque(btScalar throttle, btScalar rpm) const {
    return torque_curve.Interpolate(rpm) * throttle;
}
```

扭矩曲线（Torque Curve）是引擎的核心特征。通过一组 (RPM, 扭矩) 的采样点插值得到，通常在低转速时扭矩逐渐上升，中段达到峰值，高转速时衰减。

### 3.2.2 离合器

离合器控制引擎和变速箱之间的扭矩传递。完全结合时扭矩 1:1 传递，半联动时部分传递，完全分离时引擎空转：

```cpp
// VDrift 中的离合器模型
// transfer 值在 0（分离）到 1（结合）之间
transfer = clutch->transferValue;
engineTorque = rawTorque * transfer;
```

### 3.2.3 变速箱

不同档位对应不同的齿轮比，决定了引擎扭矩放大倍数：

```cpp
// VDrift - cardynamics.cpp
driveline.gear_ratio = transmission.GetCurrentGearRatio()
                     * differential.finalDrive;
```

一档齿轮比大（加速快但极速低），高档齿轮比小（加速慢但极速高）。

### 3.2.4 差速器

差速器将变速箱输出分配给左右车轮。最关键的是**限滑差速器（LSD）**——当一侧车轮失去抓地力时，LSD 会限制扭矩向打滑轮的传递，保证另一侧仍有驱动力：

```cpp
// PhysX Vehicle2 - 四驱差速器
void PxVehicleDifferentialStateUpdate(
    const PxFourWheelDriveDifferentialParams& diffParams, ...) {
    // 前轴差速器：比较左右轮速差
    if (ratio > diffParams.frontBias) {
        // 触发限滑，调整扭矩分配
        Tf = ...;
    }
    // 中央差速器：比较前后轴速差
    // ...
}
```

### 3.2.5 轮胎力模型

这是**整个传动链中最重要的环节**。传动系统把扭矩传递到车轮，让车轮旋转。但真正让车前进的，是轮胎和地面之间的摩擦力。

这一点非常反直觉——**引擎并不直接推动车前进，引擎只是让车轮转得更快。真正推动车前进的是轮胎摩擦力。**

轮胎力的计算依赖于两个关键参数：

**纵向滑移率（Longitudinal Slip）：**
```
slip = (wheelSpeed × radius - groundSpeed) / max(|groundSpeed|, ε)
```
- 正值：车轮转得比车走得快（加速）
- 负值：车轮转得比车走得慢（刹车）

**侧向滑移角（Lateral Slip Angle）：**
```
slipAngle = atan(lateralSpeed / |longitudinalSpeed|)
```
车轮前进方向与实际运动方向之间的夹角，在转弯时产生。

### 3.2.6 Pacejka Magic Formula

轮胎力与滑移率之间的关系用 **Pacejka Magic Formula** 描述：

```
F = D × sin(C × atan(B × x - E × (B × x - atan(B × x))))
```

其中 x 是滑移率或滑移角，B、C、D、E 是四个经验参数，F 是轮胎产生的力。这条 S 形曲线精确模拟了轮胎的特性：小滑移时力线性增长，达到峰值后逐渐下降（轮胎打滑）。

**摩擦圆（Friction Circle）** 是理解轮胎行为的关键概念：纵向力（加/刹车）和横向力（转向）共享同一个摩擦力上限。全力刹车时转向能力下降，全力转弯时刹车距离变长。漂移的本质就是故意让轮胎突破摩擦圆的极限。

# 4. 悬挂系统

悬挂连接车身和车轮，决定了车辆的操控感受。

## 4.1 弹簧-阻尼模型

最基础的悬挂模型：

```
F = k × displacement - c × velocity
```

- `k`（弹簧刚度）：悬挂压缩时抵抗的力，越大越硬
- `c`（阻尼系数）：悬挂运动速度的阻力，防止无限震荡

所有方案（从 Raycast Vehicle 到自定义约束）的悬挂力学本质上都是这个公式。

## 4.2 防倾杆（Anti-Roll Bar）

连接同一轴上左右悬挂的弹簧，抑制车身侧倾。转弯时外侧悬挂被压缩，防倾杆将部分力传递到内侧悬挂，减少车身倾斜。

```cpp
// VDrift 中的防倾杆实现
btScalar antiroll = antirollBarStiffness * (displacement_left - displacement_right);
// 左右悬挂力分别加减 antiroll
```

## 4.3 悬挂几何（进阶）

真实的悬挂系统不是简单的垂直弹簧，而是有多连杆结构，影响：

- **Camber**（外倾角）：轮胎从上到下向内或向外倾斜
- **Toe**（束角）：轮胎从上方看向内或向外偏转
- **Caster**（主销后倾）：转向轴的倾斜角度

这些几何参数会影响轮胎的接地角度和转向特性。Forza 和 GT 都模拟了悬挂几何变化。

# 5. 开源项目深度分析

## 5.1 VDrift（⭐398）

**https://github.com/VDrift/vdrift**

VDrift 使用 Bullet Physics 作为底层碰撞检测，但**完全不用 btRaycastVehicle**，自己实现了一套车辆物理系统。

**文件结构：**
```
src/physics/
├── cardynamics.cpp/h     // 车辆动力学主循环
├── carwheel.h            // 车轮（DriveShaft 旋转状态）
├── wheelconstraint.h     // 自定义约束（悬挂+摩擦）
├── carengine.cpp/h       // 引擎（扭矩曲线）
├── carsuspension.cpp/h   // 悬挂
├── cartire*.cpp/h        // 轮胎（Pacejka）
├── carclutch.h           // 离合器
├── cartransmission.h     // 变速箱
├── cardifferential.h     // 差速器
└── driveline.h           // 传动线整体
```

**核心更新循环：**

```cpp
void CarDynamics::UpdateDriveline(btScalar dt) {
    // 1. 更新悬挂
    for (int i = 0; i < WHEEL_COUNT; ++i)
        UpdateSuspension(i, dt);

    // 2. 预求解悬挂约束
    for (int n = 0; n < solver_iterations; ++n)
        for (int i = 0; i < WHEEL_COUNT; ++i)
            wheel_constraint[i].solveSuspension(*body);

    // 3. 设置传动线（引擎→离合→变速→差速→车轮）
    SetupDriveline(wheel_orientation, sdt);

    // 4. 迭代求解（子步多次）
    for (int n = 0; n < substeps; ++n) {
        UpdateWheelConstraints(wheel_constraint, rdt, sdt);
        driveline.solve(*body);             // 传动线约束
        for (int i = 0; i < WHEEL_COUNT; ++i)
            wheel_constraint[i].solveFriction(*body);  // 轮胎摩擦
        for (int i = 0; i < WHEEL_COUNT; ++i)
            wheel_constraint[i].solveSuspension(*body); // 悬挂
    }
}
```

这段代码清晰地展示了完整的力传递链：引擎扭矩通过传动线传递到 DriveShaft（车轮旋转状态），DriveShaft 的角速度通过 `solveFriction` 反馈到车身刚体的速度上。

## 5.2 PhysX Vehicle2（工业级参考）

**https://github.com/NVIDIA-Omniverse/PhysX/tree/master/physx/source/physxvehicle**

PhysX 的车辆模块是完全独立的子系统，架构非常清晰：

```
physxvehicle/src/
├── rigidBody/    → 车身刚体（独立于 PxRigidBody）
├── suspension/   → 悬挂（平面求交 + 弹簧阻尼）
├── tire/         → 轮胎（滑移率 → 摩擦力）
├── wheel/        → 车轮（1D 旋转状态）
├── drivetrain/   → 传动系统（引擎/离合/变速/差速）
├── steering/     → 转向
└── roadGeometry/ → 路面检测
```

PhysX 提供两种驱动模式：

**Direct Drive（简单模式）：** 直接给每个轮子设置驱动扭矩，适合 Arcade 游戏。

```cpp
void PxVehicleDirectDriveUpdate(const PxReal driveTorque, ..., PxVehicleWheelRigidBody1dState& state) {
    // w(t+dt) = w(t) + (1/inertia) × (tireTorque + driveTorque + brakeTorque) × dt
    state.rotationSpeed = (currentSpeed + dtOverMOI * totalTorque)
                        / (1.0f + dampingRate * dtOverMOI);
}
```

**完整传动链模式：** 模拟引擎、离合器、变速箱和差速器。

**最值得注意的是：** PhysX Vehicle2 的车身刚体完全不走 PhysX 的通用场景（`PxScene`），而是在自己的模块里独立做积分。这意味着车辆物理和场景中其他物体的碰撞需要额外的同步处理。这个设计选择反映了赛车物理对精度的极致追求。

## 5.3 TORCS（⭐47）

**https://github.com/jeremybennett/torcs**

TORCS 是最"纯粹"的实现——不用任何物理引擎，所有物理都是数学模型。轮子位置通过悬挂数学模型直接计算，轮子产生的力直接累加到车身：

```cpp
// car.cpp
wheel->pos.x = car->DynGCg.pos.x + dstVec[0];  // 悬挂偏移
F.F.x += wheel->forces.x;  // 力直接累加
```

引擎扭矩经过完整的传动链传递到轮子，再通过轮胎模型产生地面反作用力。简单粗暴但有效。

## 5.4 对比总结

| 项目 | 物理引擎 | 悬挂方案 | 传动系统 | 轮胎模型 | 复杂度 |
|------|---------|---------|---------|---------|-------|
| **VDrift** | Bullet（自定义约束） | 自定义 WheelConstraint | 完整 | Pacejka | ⭐⭐⭐⭐ |
| **PhysX Vehicle2** | 自研（独立积分） | Raycast + 弹簧阻尼 | 完整 | Pacejka | ⭐⭐⭐⭐⭐ |
| **TORCS** | 无 | 数学模型 | 完整 | Pacejka | ⭐⭐⭐ |
| **SuperTuxKart** | Bullet btRaycastVehicle | Raycast 内置 | 无 | 简化 | ⭐⭐ |
| **Unity Mario Kart 克隆** | Unity Rigidbody | 无 | 无 | 无 | ⭐ |

# 6. 商业游戏是怎么做的

虽然没有商业游戏的源码可以参考，但大量的 GDC 演讲、技术博客和开发者访谈揭示了它们的实现方式。有一个结论非常明确：**没有一个商业赛车大作使用引擎内置的 Vehicle API。**

## 6.1 共同规律

1. **全部自研车辆物理系统**，不依赖引擎内置的 Raycast Vehicle 或 WheelCollider
2. **轮胎模型是整个系统的核心**，投入最多的开发时间
3. **物理频率远高于渲染帧率**（600-1000Hz），保证高速稳定性和轮胎模型精度
4. **传动系统全部模拟**，即使是 Arcade 游戏
5. **"真实感"靠调参不靠算法** — Forza 和 GT 用类似的技术方案，手感差异巨大

## 6.2 代表性游戏

### 6.2.1 Forza Motorsport / Horizon

- 轮胎：完整 Pacejka Magic Formula + 温度分布 + 磨损模型
- 接触斑不是单点，而是多个接触点拼成轮胎印
- 物理频率估计在数百 Hz 以上
- 完整传动系统：引擎（扭矩曲线）→ 离合器（打滑模型）→ 变速箱 → 差速器（限滑）→ 轮胎
- Forza 5 开始加入涡轮增压模拟
- Forza Horizon 的"Arcade 化"：同样的物理引擎，但轮胎摩擦曲线更宽容，漂移时自动调整辅助

### 6.2.2 DiRT 系列

- 不用标准 Pacejka，**自研松散路面轮胎模型**
- 泥地、碎石、雪地各有独立参数
- 路面形变：车辙在泥地上留下痕迹，后续车辆经过时轨迹变深
- 物理频率约 **600Hz**
- DiRT Rally（最真实的 Codemasters 作品）包含手动档离合器操作

### 6.2.3 Gran Turismo

- GT6 开始使用**极精细的轮胎模型**：温度分布（接触斑上各点温度不同）、胎压影响、磨损模型
- GT Sport 物理频率提到约 **1000Hz**
- 与轮胎厂商（Bridgestone）和汽车厂商合作获取真实数据

### 6.2.4 Need for Speed 系列

- Frostbite 引擎 + 自定义车辆物理
- 简化 Pacejka 轮胎模型
- 漂移时临时修改轮胎摩擦曲线（降低侧向抓地力）
- 即使是 Arcade 游戏，也有完整的引擎扭矩→变速箱→差速器链路

# 7. 实战建议

## 7.1 最简可行方案

如果你想从零实现，推荐的起步方案：

1. 刚体车身（Rigidbody）
2. 每帧 Raycast 检测地面
3. 弹簧-阻尼悬挂模型
4. 简化 Pacejka 轮胎模型
5. 引擎扭矩 → 车轮角速度 → 轮胎力 → 车身力

这就是一个可用的车辆物理系统的最小集合。

## 7.2 迭代路线

| 阶段 | 内容 | 预期效果 |
|------|------|---------|
| **V0** | 刚体 + Raycast 悬挂 + 直接力驱动 | 车能在平地上跑 |
| **V1** | 加入简化轮胎模型（滑移率→力） | 有抓地力、会打滑 |
| **V2** | 加入引擎扭矩曲线 + 变速箱 | 有档位、有加速曲线 |
| **V3** | Pacejka 完整版 + 差速器 | 真实的过弯和漂移 |
| **V4** | 防倾杆 + 悬挂几何 | 更精细的操控感受 |
| **V5** | 轮胎温度 / 磨损 / 空气动力学 | 终极模拟 |

## 7.3 最重要的建议

**调参比算法重要。** 一个简单的物理模型 + 大量精心调参，远好于一个完美的物理模型 + 粗糙的参数。所有商业大作的差异化都在调参上——Forza 和 GT 用类似的技术方案，手感却截然不同。

**轮胎模型决定一切。** 80% 的驾驶手感来自轮胎模型。如果你只有时间做一件事，就做轮胎。

**物理频率要够高。** 如果你的渲染是 60fps，物理至少要 240Hz（每帧 4 个子步），最好是 600Hz+。高速时一个渲染帧内车辆移动距离很大，低频率的物理更新会导致不稳定。

## 7.4 推荐学习资源

### 经典入门

- **Marco Monster — "Car Physics for Games"**（http://www.asawicki.info/Mirror/Car%20Physics%20for%20Games/Car%20Physics%20for%20Games.html）：最经典的车辆物理入门教程，2000 年发表但至今被广泛引用。覆盖引擎力、制动力、轮胎摩擦、悬挂弹簧、转向几何（Ackermann）、侧滑和漂移。所有 GDC 车辆物理演讲几乎都会引用。
- **Gamedeveloper.com — "Car Physics"**（https://www.gamedeveloper.com/programming/car-physics）：Gamasutra（现 Gamedeveloper.com）的深度文章，讨论轮胎滑移模型、悬挂力学、传动系统建模、arcade vs simulation 的取舍。
- **Toptal — "Video Game Physics Tutorial: Rigid Body Dynamics"**（https://www.toptal.com/developers/game/video-game-physics-part-i-an-introduction-to-rigid-body-dynamics）：虽然是通用刚体动力学教程，但第三部分专门讲车辆物理中的刚体应用。

### 实战教程与开源项目

- **TORSION Community Edition**（https://github.com/LemonMontage420/TORSION-Community-Edition）：Unity 实现的教学级车辆物理引擎。不用 WheelCollider，完全自研：Pacejka Magic Formula 轮胎模型、弹簧-阻尼悬挂、完整传动系统（引擎→离合→变速→差速）。有详细教学文档和可视化工具，可导出数据到 MATLAB 验证。强烈推荐。
- **VDrift**（https://github.com/VDrift/vdrift）：C++ 完整实现的赛车模拟器，基于 Bullet Physics 但自定义约束。完整的 Pacejka 轮胎、DriveShaft 车轮模型、传动线约束求解。本文多处引用其代码。
- **Stunt Rally**（https://github.com/stuntrally/stuntrally）：基于 VDrift 物理的 3D 赛车游戏，VDrift 方案的游戏化实现参考。
- **PhysX Vehicle2 源码**（https://github.com/NVIDIA-Omniverse/PhysX/tree/master/physx/source/physxvehicle）：NVIDIA 工业级车辆物理实现。模块化架构（rigidBody / suspension / tire / wheel / drivetrain / steering / roadGeometry），车身独立于 PxScene 积分。提供 Direct Drive 和完整传动链两种模式。
- **TORCS**（https://github.com/jeremybennett/torcs）：纯数学模拟的开源赛车，不用任何物理引擎。力直接累加到车身，代码简洁易懂。
- **SuperTuxKart**（https://github.com/supertuxkart/stk-code）：基于 Bullet btRaycastVehicle 的定制版（btKart），4K+ 星的成熟项目，Raycast Vehicle 方案的游戏级实现参考。
- **PlayCanvas — Vehicle Physics Tutorial**（https://developer.playcanvas.com/tutorials/vehicle-physics/）：使用 ammo.js（Bullet WASM 版本）的 RaycastVehicle API，代码简洁，适合快速理解核心概念。
- **itch.io — "Simple Car Physics System"**（https://itch.io/blog/840477/simple-car-physics-system）：2024 年的新手教程，手把手从零实现四轮车辆物理。
- **DigitalRune — Vehicle Physics 文档**（https://digitalrune.github.io/DigitalRune-Documentation/html/143af493-329d-408f-975d-e63625646f2f.htm）：总结了 Constraint Car 和 Arcade Car 两种实现方式的对比。

### 深度文章

- **Medium — "How We Implemented Vehicle Mechanics in Our Game — Part 1"**（https://ottowretling.medium.com/how-we-implemented-vehicle-mechanics-in-our-game-part-1-c88f4bf92ff8）：实际游戏开发中的车辆物理实现经验。
- **Medium — "Programming Physics-Based Gameplay Controllers"**（https://blog.saket.dk/programming-physics-based-gameplay-controllers-d1e532957aa0）：2024 年，基于物理引擎做手感好的游戏控制器，不限于车辆。
- **GameDev StackExchange**（https://gamedev.stackexchange.com）：大量高质量问答，推荐搜索 "vehicle physics"、"car physics"、"tire model" 等标签。

### Unity 专用

- **Unity 论坛 — "Incredibly good deep dive into car physics"**（https://discussions.unity.com/t/incredibly-good-deep-dive-into-car-physics/907520）：2023 年的深度解析汇总帖。
- **Edy's Vehicle Physics**（https://www.edy.es/dev/vehicle-physics/）：Edy Pozzi 的 Unity 车辆物理 Asset 和技术博客，Unity 车辆物理的权威参考。

### GDC / 行业演讲

- **GDC 2005** — "Forza Motorsport: The Physics of Racing"（Turn 10）
- **GDC 2011** — "Forza Motorsport 4: Driving Realistic Racing"（Turn 10）
- **GDC 2015** — "The Physics of FORZA HORIZON 2"（Playground Games）
