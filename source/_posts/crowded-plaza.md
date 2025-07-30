---
title: Crowded Plaza, a game with Bevy/Rust| 拥挤广场：使用Bevy/Rust开发小游戏
date: 2022-07-26 00:00:00
tags:
  - Rust
  - Game Development
  - Technical
  - ECS
---

![](/images/screenshot-1600x911.jpg)

[在线玩这个游戏](http://crowded-plaza.vercel.app/)
[项目Github](https://github.com/maajor/crowded-plaza)

为什么是Bevy和Rust？ 当然因为Rust有点火，笔者想试试玩玩，学习学习Rust。

目前看上去Rust应用比较多的领域是数据库/区块链/跨端部署应用，也就是传统C++的领域，追求性能和多平台，但是Rust多出现在较新的应用场景，比如区块链就是个典型的例子。

游戏引擎主要还都是C++的，并且需要跨端部署，这个领域也是Rust有可能进入的。Rust上游戏引擎目前（2022-7）最有名的就是Bevy了，一个原生ECS架构的游戏引擎，听着还挺新奇的。众所周知，目前流行的游戏引擎如UE，Unity大多是OOP，并没有从一开始就使用Data-Oriented和ECS的方式，有一些历史包袱，但也都新加了ECS模式。入门Rust就会发现，Rust语言比较推崇组合而不是继承，ECS也就顺理成章。

当然现在用Rust写游戏的还不多，笔者比较喜欢的Embark Studio就是其中之一，Embark (github.com) 。Rust上著名的Kajiya渲染器便是Embark的作品。

# 1. 游戏基本逻辑

这个游戏受到CrowdedCity的启发，是一个休闲io游戏的变种，并且是3D的。io游戏还比较适合ECS，其中可能有大量entity更新的逻辑。

这个玩法也很简单，控制一个小人游走，同化附近的路人，获取最多的路人就可以获胜。
玩家和每个敌人算一个阵营，

角色可以分两种
- pawn，是每个敌人或者玩家控制的。玩家通过鼠标控制，敌人就随机游走
- actor，是路人
Pawn结束的条件是同阵营只剩自己且接近了别的阵营。

路人有两个状态：
- 未同化状态，随机游走
- 同化状态，跟随角色，这个行为比较像flocking，有align，aggregate，repulse几个基础行为。
从未同化到同化状态，判定依据是周边一定范围内最多的路人的阵营。

## 1.1 对象建模
所以对象可以这么建模，比较类似UE的Actor-Pawn-Controller的层次划分，只不过是通过组合实现的。
```
#[derive(Component)]
struct Actor {
    faction: i32,
    velocity: Vec3,
    accleration: Vec3,
}
#[derive(Component)]
struct Pawn;
#[derive(Component)]
struct PlayerController;
#[derive(Component)]
struct OpponentController;
```
如果一个Entity有Actor但没有Pawn就是路人，反之就是敌人或者玩家。
敌人和玩家运动的方式不一样，分别挂了OpponentConntroller和PlayerController组件。
Actor这里存了faction就是所在阵营，-1即未同化状态。
同时还记了velocity和acceleration，因为用“力”的概念来更新运动看上去更符合视觉表现。

## 1.2 System设计
总共有8个system
有一些行为等效于作用力，根据actor之间相互关系，更新actor的acceleration和底层逻辑
- change_actor_faction_system，判断路人的阵营转换，更换视觉表现，
- follow_pawn_system，同阵营跟随pawn，更新actor的acceleration
- repulse_actor_system，actor之间相互排斥，更新actor的acceleration

有些行为直接更新velocity，
- change_direction_player_system，通过鼠标交互控制玩家的运动，更新velocity
- change_direction_actor_system，未同化的路人随机游走，更新velocity
- change_direction_opponent_system，敌人随机游走，更新velocity

有些行为通过velocity和acceleration更新actor位置
- move_actor_system，实际运动actor，更新位置，这里会acceleration
- move_pawn_system，实际运动pawn，更新位置，这个不考虑acceleration

比较复杂的是change_actor_faction_system，会涉及空间查询，这里使用了bevy_spatial这个库，用了一个kdtree。
伪码类似：
```
foreach actor in all actors:
  neighbor_actors <- find_neighbor_within_radii
  foreach neighbor in neighbor_actors:
      neighbor_faction++
  sort neighbor_faction
foreach actor in all actors:
  set faction by neighbor max faction
```
至于，为什么要两个loop解决，不能一个loop，
因为，query对象同时只能被一个作用域borrow，第一个loop里在空间查询时一定会被borrow，就只能让所有遍历到的actor只读了。也是rust一个特殊的语法设计。


# 2. Bevy使用
官方文档聊胜于无，看用法基本参考官方案例
bevy/examples at main · bevyengine/bevy (github.com)
和一个非官方的文档
Introduction - Unofficial Bevy Cheat Book (bevy-cheatbook.github.io)
还是比较清楚

## 2.1 System的输入
和Unity ECS不同的是，Bevy的System输入有更多中，比如这个例子中
```
fn replay_button_system(
    mut interaction_query: Query<
        (&Interaction, &mut UiColor, &Children),
        (Changed<Interaction>, With<Button>),
    >,
    mut state: ResMut<State<GameState>>,
) {
    for (interaction, mut color, _) in interaction_query.iter_mut() {
        match *interaction {
            Interaction::Clicked => {
                state.set(GameState::Playing).unwrap();
                *color = PRESSED_BUTTON.into();
            }
            Interaction::Hovered => {
                *color = HOVERED_BUTTON.into();
            }
            Interaction::None => {
                *color = NORMAL_BUTTON.into();
            }
        }
    }
}
```
它是一个system，但是是一个UI按钮的system。system的输入里，
- 可以有Resource，即一些全局资源，比如这里用的游戏状态，也可以定义用户定义自己的全局状态
- 可以是Component，component可以通过 With, Without, Changed修饰，甚至交互状态interaction都是个Component

## 2.2 互斥查询
一个注意的点是，system中query需要互斥，比如
Failed to access two mut components in one system with two querys · Issue #2198 · bevyengine/bevy (github.com)

下面这个例子会报错create disjoint Queries or merging conflicting Queries into a ParamSet 05MB
```
fn ai_system(
    monster_query: Query<(&Monster, &Transform)>,
    mut hunter_query: Query<(&Hunter, &mut Speed, &Transform, &AI)>,
) {}
```
因为有可能有一个entity，同时满足上面两个Query
需要改成
```
fn ai_system(
    mut monster_query: Query<(&Monster, &mut Speed, &Transform), Without<Hunter>>,
    mut hunter_query: Query<(&Hunter, &mut Speed, &Transform, &AI), Without<Monster>>,
) {}
```
## 2.3 通过Entity获取Component
一个注意的点是，通过entity获取component只有通过query一种方式，这时bevy0.7目前比较奇怪的地方。
需要
`let comp = query.get(entity)`
没有
`entity.get_component<>()`

上面这两点，再加上rust规定同一个同时只能被borrow一次，就出现了上面change_actor_faction_system中，需要两个loop解决。

## 2.4 渲染Feature缺少
bevy 0.6中重构了RenderGraph和Clustered Forward, 可以支持大量光源 Bevy - Bevy 0.6 (bevyengine.org)
不过现在bevy还有很多欠缺：
- 不支持ibl，hdri图
- 没有SSAO/HBAO/GTAO任何一种
- 没有后处理
- 没有PCF/PCSS/EVSM任何一种软阴影
- 没有烘焙
- culling很差
这算什么PBR，这么点feature需要RenderGraph干嘛？

## 2.5 没有编辑器
光写游戏逻辑没有编辑器还好，但是为了拼UI是有点痛苦。
如果像javascript可以快速热更，没有编辑器拼ui还凑活。在Bevy里没有编辑器编译又慢，拼ui真的太痛苦了。
如果说bevy_inspector_egui也算编辑器吧，其实更像是运行时的状态查看器，不能算authoring的编辑器。
比如目前的一个UI代码，非常啰嗦
```
commands
.spawn_bundle(NodeBundle {
    style: Style {
        margin: Rect::all(Val::Auto),
        flex_direction: FlexDirection::ColumnReverse,
        align_items: AlignItems::Center,
        ..default()
    },
    color: UiColor(Color::rgba(0.0, 0.0, 0.0, 0.0)),
    ..default()
})
.with_children(|parent| {
    if ordered_fac_to_count[0].0 == 0 {
        parent.spawn_bundle(TextBundle {
            style: Style {
                margin: Rect::all(Val::Px(20.0)),
                ..default()
            },
            text: Text::with_section(
                "Victory!",
                TextStyle {
                    font: asset_server.load("fonts/FiraMono-Medium.ttf"),
                    font_size: 40.0,
                    color: Color::WHITE,
                },
                TextAlignment {
                    horizontal: HorizontalAlign::Center,
                    ..default()
                },
            ),
            ..default()
        });
    } else {
        parent.spawn_bundle(TextBundle {
            style: Style {
                margin: Rect::all(Val::Px(20.0)),
                ..default()
            },
            text: Text::with_section(
                "You Lose!",
                TextStyle {
                    font: asset_server.load("fonts/FiraMono-Medium.ttf"),
                    font_size: 40.0,
                    color: Color::WHITE,
                },
                TextAlignment {
                    horizontal: HorizontalAlign::Center,
                    ..default()
                },
            ),
            ..default()
        });
    }
    for (fac, score) in ordered_fac_to_count {
        parent.spawn_bundle(TextBundle {
            style: Style {
                margin: Rect::all(Val::Px(10.0)),
                ..default()
            },
            text: Text::with_section(
                format!("{0}: {1}\n", naming.names.get(fac as usize).unwrap(), score),
                TextStyle {
                    font: asset_server.load("fonts/FiraMono-Medium.ttf"),
                    font_size: 20.0,
                    color: Color::WHITE,
                },
                TextAlignment {
                    horizontal: HorizontalAlign::Center,
                    ..default()
                },
            ),
            ..default()
        });
    }
    parent
        .spawn_bundle(ButtonBundle {
            style: Style {
                size: Size::new(Val::Px(200.0), Val::Px(65.0)),
                margin: Rect::all(Val::Px(20.0)),
                justify_content: JustifyContent::Center,
                align_items: AlignItems::Center,
                ..default()
            },
            color: NORMAL_BUTTON.into(),
            ..default()
        })
        .with_children(|parent| {
            parent.spawn_bundle(TextBundle {
                text: Text::with_section(
                    "Play Again!",
                    TextStyle {
                        font: asset_server.load("fonts/FiraMono-Medium.ttf"),
                        font_size: 30.0,
                        color: Color::WHITE,
                    },
                    Default::default(),
                ),
                ..default()
            });
        });
});
```
如果是unity，大概率直接编辑器界面拼ui了，不用写代码，
如果用jsx来写大概会这样，然后用css管理样式，明显简单很多。
```
<div>
    {win && <div class="title">Victory!</div>
    {!win && <div class="title">You Lost!</div>
    {[...Array(6)].map((x, i) =>
      <div key={i} class="score"> {name[i]}: {score[i]}</div>
    )}
<div>
```
## 2.6 简陋的Web支持
Bevy确实可以原生build到wasm，不过遇到几个问题
- Bevy渲染模块wgpu的webgl2后端在移动端支持不好，打开无法操作
- bevy原生打出来的wasm不能全屏canvas
后者参考了一个github issue https://github.com/mvlabat/bevy_egui/issues/56， 具体思路就是脱离bevy，直接用web_sys绑定一个dom window的onresize事件，触发bevy自己的resize屏幕。

# 3. Benchmark
## 3.1 速度与性能
用bevy ecs和unity entities比较性能如何呢？
笔者测了一个 200 x 200 x 50 ~ 2 million cube的场景，
![ee97337f-e72a-48df-8e79-5fd016b3add4.png](/images/ee97337f-e72a-48df-8e79-5fd016b3add4.jpg)
![bc323c80-530d-44bf-a2b1-29512b123c91.png](/images/bc323c80-530d-44bf-a2b1-29512b123c91.jpg)
### 3.1.1 Unity
值得吐槽的是，笔者这次使用的Unity Entities 0.51，和几年前使用的0.1x差别太大了，都快不认识了。
使用自带的Profiler查看，
![fd7b5a14-741e-47da-b27d-7f94859e2404.png](/images/fd7b5a14-741e-47da-b27d-7f94859e2404.jpg)
### 3.1.2 Bevy
使用自带的trace，
cargo run --release --example many_cubes bevy/trace_chrome
然后用在线工具可视化 https://ui.perfetto.dev/
![a7e4e9e2-06bc-4f04-a2e3-07104d6574d9.png](/images/a7e4e9e2-06bc-4f04-a2e3-07104d6574d9.jpg)
### 3.1.3 总结
总的看下来，Native环境下，（Bevy = wgpu vulkan， Unity = DX11 ）单帧时间Bevy比Unity慢了十倍；
其中System的查询和计算慢了接近一倍
渲染慢了十倍。可以看出Bevy的渲染性能还有很大提升的空间。

| Feature           | Bevy     | Unity   |
|-------------------|----------|---------|
| 总单帧时间         | ~400 ms  | ~40 ms  |
| Rotate Cube时间   | ~8 ms    | ~3 ms   |
| 更新Transform时间 | ~12 ms   | ~8 ms   |
| 渲染Batching时间   | 无       | ~15 ms  |
| 渲染时间           | ~350 ms  | ~6 ms   |


同样是编译到llvm，unity使用burst compiler搭配ECS看上去有更好的性能。同时由于unity的渲染batch和culling算法更为先进，总体上比bevy快不少。
从性能上看，Bevy没有展现出巨大的优势。

## 3.2 Wasm包体大小

我们来对比下打包Wasm的大小，这里有两个例子：
- 一个只有一个Cube的极小场景
- 一个有2M个Cube使用ECS的场景

### 3.2.1 Minimal Cube
Unity直接使用built-in管线，
得益于最近unity功能也package化，我们可以关掉很多功能，
只保留UI和渲染；关闭Terrain，物理，声音，动画，WWW，AssetBundle等各种功能。
![e094e217-d2f0-4b87-aa43-347bf7fc8829.png](/images/e094e217-d2f0-4b87-aa43-347bf7fc8829.jpg)
使用Monobehavior写一个旋转的cube，长这样
![40d51fc0-cfd5-4144-b4f6-5c84c8944686.png](/images/40d51fc0-cfd5-4144-b4f6-5c84c8944686.jpg)
最终wasm大小5.15MB，如果用gzip压缩是1.85MB。

同样Bevy我们也关掉物理/声音/动画等功能，只保留UI和渲染需要的 bevy_core_pipeline, bevy_render  bevy_pbr bevy_text, bevy_ui bevy_sprite 模块。
不能关掉ECS，因为它原生ECS。
![20a290b9-9ad8-4c29-9a1c-1cb0ee7a9daa.png](/images/20a290b9-9ad8-4c29-9a1c-1cb0ee7a9daa.jpg)
最终尺寸，Wasm大小7.93MB，gzip压缩1.97MB。

可以说二者半斤八两。
### 3.2.2 Many Cube

渲染两百万个Cube，Unity就必须引入ECS系统了。但是ECS系统依赖于很多模块
- Hybrid Renderer&SRP，DOTS的渲染系统依赖于一个特殊的SRP
- Job/Burst/Mathematic等Entities模块必须依赖的组件
这些全加进来，Wasm包体直接飙到19.3MB，gzip压缩尺寸6.19MB。

而Bevy由于原生ECS的优势，和上面的Minimal Cube差距不大，只是多了些业务代码。
最后Wasm大小8.19MB，gzip压缩2.05MB。

这样来看，带着ECS的话bevy的包体比unity还是小了几倍的。

### 3.2.3 总结
单纯写一个游戏的话，从包体尺寸上看bevy也没啥优势。只有在必须ECS的情况下，bevy包体尺寸才有几倍的优势。
不过就算是unity ecs这个gzip的压缩，6.19MB对于当前的网页应用来说，应该是大部分情况都可以接受的。
所以从包体上看，bevy没有展现出绝对的优势。

| Feature                           | Bevy    | Unity  |
|-----------------------------------|---------|--------|
| Minimal Cube Wasm Uncompressed    | 7.93 MB | 5.15 MB|
| Minimal Cube Wasm Gzip            | 1.97 MB | 1.85 MB|
| ECS Many Cube Wasm Uncompressed   | 8.19 MB | 19.3 MB|
| ECS Many Cube Wasm Gzip           | 2.05 MB | 6.19 MB|


# 4 好用吗？
rust好用吗？
如果为了学Rust，使用bevy可能不是个好主意。不如去实现个链表，更能理解生命周期和智能指针。
https://rust-unofficial.github.io/too-many-lists/index.html
Rust被认为是C++的替代品，但很明显熟练C++的人不会转过来，已有的C++应用也不会转过来。不过，不会写C++的人想写高性能程序，大概率会选择Rust，在新兴领域使用它。比如在笔者关注的领域，如渲染的wgpu，客户端的tauri。这注定了它会需要一定漫长的生态建设时间。

bevy好用吗？
看上去bevy从性能和build尺寸上，都没什么优势。那么bevy在什么地方会有用呢？
在wasm这方面，如果说bevy可能有个优势，大概就是可以更底层地控制DOM元素，以及与webapp交互了。Unity在wasm上的大多数的应用场景还是单一app，比如游戏，不需要和js交互。也较难在unity里定义wasm暴露的方法。因此非游戏类的一些3D web商业应用或许用rust/bevy会方便。另一方面，bevy的ecs架构一定程度上局限了它的应用范围。如果app里全是全局唯一的component，那何必需要query获取并把逻辑写进system？直接把逻辑写进component不是更容易？况且对于一些复杂交互的应用场景，ECS能否驾驭还有待案例验证，反而是OOP的传统方式更容易表示。所以，用rust也不一定用bevy。
所以bevy能干嘛？笔者相对于Rust本身持比较悲观的态度，目前看在未来几年大概率还是个玩具。不过确实挺好玩的。

# Reference
Rust的游戏相关项目
- https://github.com/EmbarkStudios/kajiya
- https://github.com/bevyengine/bevy
- wgpu: portable graphics library for Rust

# Rust/Bevy的学习资料
bevy/examples at main · bevyengine/bevy (github.com)
Introduction - Unofficial Bevy Cheat Book (bevy-cheatbook.github.io)
https://rust-unofficial.github.io/too-many-lists/index.html
