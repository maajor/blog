---
title: Houdini Rigging for Game, A Brief Research | Houdini游戏绑定，入门踩坑
date: 2019-12-01 00:00:00
---

# 1 Why? 可行吗？

当然是很少见的。笔者所见大部分游戏公司都是Max，少部分是Maya或者Motionbuilder。虽然常见吐槽Max Biped不再维护了。然而不可否认这套系统用起来还挺方便的，而且对于大部分国内动画师，Max是入行培训学习的，也足够满足大部分手游的需求了。Maya由于方便编写工具，同样也可以是建模特效软件，自带HIK，因此全套Maya也是不错的选择。Motionbuilder对于动画制作更方便，原生HIK，动捕支持也最好。

笔者还真听说了有工作室全套Houdini绑定动作的流程。有影视工作室是使用的，可在游戏中，教程都很少见。

但是还真的有，这里就有位大佬Glen Debello，写了一个系列的Houdini/Unity绑定流程

[https://gdebello.artstation.com/blog/l9gN/houdini-to-unity-character-rigging-experience](https://gdebello.artstation.com/blog/l9gN/houdini-to-unity-character-rigging-experience)

细读他博客，神奇的是他们工作室建模也大量Houdini流程。

笔者研究了一下，确实还可以，虽然有些坑，但也有不少好处。最主要的好处，就是来自"Procedural"，也就是Houdini这个工具的核心。不仅仅指绑定流程的Procedural了，更可以扩展到美术资产Pipeline整体的Procedural。如果所有的资产，不仅仅是场景，而扩及到载具，武器，角色，模型都是Procedural生成的，那么必然就需要其后的绑定，引擎整合，配置等全部可以Procedural。

当然本文也没有很深入，大概只是个踩坑绑定之旅吧。

左：Houdini中骨骼和控制器，右：导入Unity中配置Humanoid, Enforce T-Pose就不红了。

![44757b0dff6749ce27e42fa4dade02f8.png](/images/44757b0dff6749ce27e42fa4dade02f8.jpg)

# 2 怎么使用

自然官方是有教程的，比如这个系列

[https://www.sidefx.com/learn/collections/rigging-series/](https://www.sidefx.com/learn/collections/rigging-series/)

对于理解Houdini的骨骼系统相当有帮助，里面讲解了用父子关系等等基础概念，创建骨骼方法，脚本创建控制器的方法，IKFK及其他约束，还是比较全的。不过主要的问题是，这个教程目测是面向影视的，骨骼层级问题。这和使用Houdini自带的Autorig工具是一个问题，创建确实很方便，但是骨骼中多余的东西实在太多了，导进引擎大量无用的GameObject，而且层级结构不符合Humanoid/HIK之类系统的要求，根本没法用。

笔者看的这个教程感觉也不错，当然内容大纲上和官方教程很相近了，不过比上一个好的是，看过教程发现作者把创建的骨骼导入Unity匹配了Humanoid，也就是说，游戏中肯定是可以用的了。

[https://www.udemy.com/course/game-character-rigging-with-houdini/learn/lecture/14322906#overview](https://www.udemy.com/course/game-character-rigging-with-houdini/learn/lecture/14322906#overview)

## 2.1 基础概念与注意

### 2.1.1 基于骨骼的(Bone Based)，而不是基于关节的(Joint Based)

官方文档给了很清楚的描述  [http://www.sidefx.com/docs/houdini/character/bonesvsjoints.html](http://www.sidefx.com/docs/houdini/character/bonesvsjoints.html)

![a26e09cd2c43a5661463cc79d99dd351.png](/images/a26e09cd2c43a5661463cc79d99dd351.jpg)

如果自己创建骨骼，推荐像左侧这样。但FBX导进来会像右边这样。但这对我们制作绑定有什么影响。笔者的测试结果是，就制作动画来说没有区别，反正都被控制器封装了。但是基于关节的，在蒙皮时Biharmonic不认，这样刷权重就很麻烦了。所以还是推荐创建时使用基于骨骼的系统

### 2.1.2 Pretransform

ObjNoded都会有这个参数，可以理解为Rest Position，文档里面说

物体最终的世界坐标位置是：(object's transform) * (pretransform) * (parent transform).

用Pretransfrom的好处是可以通过Clean Transform提取Pretransform，让参数面板的坐标数值归零，这样就好理解哪里是Rest Position了。所有骨骼回到Rest Pose只需要参数面板归零即可，确实是很不错的设计。

![c75f6d48565c9abbe065ee4a2d6ce358.png](/images/c75f6d48565c9abbe065ee4a2d6ce358.jpg)

### 2.1.3 Parent

![9f129956f84a13702588fae5650655bc.png](/images/9f129956f84a13702588fae5650655bc.jpg)

ObjNode的连接是Parent关系，容易混淆的是SopNode的连接是数据上下游关系。所以所有骨骼和Null节点都是ObjNode，通过连线定义了层级关系。

## 2.2 骨骼创建

理论上是可以自动创建骨骼的。有很多很多论文将如何通过模型或者图片确定关节位置，不过大部分的DCC都没有集成这种算法（笔者唯一知道的是Maya的Quick Rig)。大部分DCC都是自动帮你创建一套骨骼，需要手动把关节点移动到模型的对应骨骼位置上，Max Biped，HumanIK，Houdini AutoRig都是如此。

如果集成一些现成的外部工具包，比如OpenPose，以及（如果有的话）扩展版的识别生物骨骼的工具，完全可以自动创建骨骼，不仅仅是人体，更可以是动物，怪兽，甚至载具....然而笔者这里不会就此展开，本文还是比较基础的，关于如何手动创建骨骼的。

首先要注意的是骨骼的层级结构，要符合Humannoid标准，而且不要带多余的Null，要不然进引擎会有多余计算。Houdini AutoRig的主要问题就是节点太多而且层级结构不对。

比如笔者这样搭建的，在导出fbx选择不导出隐藏节点，这样进引擎就很干净了。

![bb925c1b4320be9264eb5455554466d0.png](/images/bb925c1b4320be9264eb5455554466d0.jpg)

一般来讲创建骨骼用Shelf里面的Bone Tool就好（位置Rigging-Bones），具体操作还是看视频的好。需要注意的是，骨骼默认旋转顺序是zyx，所以主要旋转方向要是X轴，骨骼尖的方向。

比如这里ForeArm的X轴就要指向肘关节运动方向

![f09ecec18d4539caafcc9bce5ec54e81.png](/images/f09ecec18d4539caafcc9bce5ec54e81.jpg)

另外一个需要注意的是骨骼镜像，所有Houdini Rigging教程里都会直接使用Mirror Tool(Modify-Mirror)镜像骨骼。

甚至官方文档都建议用Mirror Tool   [http://www.sidefx.com/docs/houdini/character/mirror.html](http://www.sidefx.com/docs/houdini/character/mirror.html)

但这样的问题是，会造成镜像骨骼-1的缩放。尽管影视里这无所谓，不过游戏引擎中还是要避免，否则不知道哪里会出问题（比如笔者碰到过镜像骨骼上碰撞体坏掉。。。）

解决方法是可以自己写一个Shelf Tool

基本原理就是把Pretransform放进来，一些参数做负，然后做Pretransform

```
nodes = hou.selectedNodes()

for node in nodes:
    node.movePreTransformIntoParmTransform()
    node.parm("constraints_on").set(0)
    y = node.parm("ry").eval() * -1
    z = node.parm("rz").eval() * -1
    tx = node.parm("tx").eval() * -1
    node.parm("ry").set(y)
    node.parm("rz").set(z)
    node.parm("tx").set(tx)
    node.moveParmTransformIntoPreTransform()
    node.parm("Rx").set(0)
    node.parm("Ry").set(0)
    node.parm("Rz").set(0)
```

## 2.3 控制器与约束

FK控制器创建很简单，主要逻辑以这个LeftArm为例，前文提到的视频教程里一般都会写一个Shelf Tool创建，就是

1. 创建节点，parent到LeftArm，使得位置与LeftArm一致
2. parent到父节点，不改变位置，坐标归入Pretransform
3. 骨骼旋转Channel连到控制器，锁上不需要改变的Channel

比较简单代码就不贴了

![86f755e42c8ddbe0964c4a7503ce8072.png](/images/86f755e42c8ddbe0964c4a7503ce8072.jpg)

IK就用Shelf上Rigging-IK From Bone就好。这里IK作用原理是在Chop中位置信息，然后override掉ObjNode本身的位置。同样可以在Chop中设置transform约束，lookat约束等，这里就不展开了。

Houdini中很方便的一点是Null这个ObjNode是可以改显示属性的，和Motionbuilder中很相似，简单勾选就可以改变形状和颜色等等，因此作为控制器非常合适（其实内部是个Control Sop)。

![8522457fcca55021176ee26781bb13e3.png](/images/8522457fcca55021176ee26781bb13e3.jpg)

## 2.4 权重

自动创建蒙皮权重有两种方法，比较推荐Bone Capture Biharmonic，少有会有失效的情况。

典型使用如下

![184e8bd8ea36b0ede287ae7d218ef81d.png](/images/184e8bd8ea36b0ede287ae7d218ef81d.jpg)

另一种是Bone Capture，需要设置骨骼的Capture Region，如下面笔者自动生成的Capture Region，效果没有Biharmonic好。

![9a9d956fb0cf03e0f19bd0cf6d5237bb.png](/images/9a9d956fb0cf03e0f19bd0cf6d5237bb.jpg)

Capture以后可能有需要手修的地方，用

Capture Layer Paint

真的可以手刷权重。它可以指定只作用于某个group prim，选择面的工具也挺方便。另外还有一种方式是可以输入一个Intersection Geometry，根据和这个几何体相交的情况计算权重。

还有个trick是可以用Smooth Sop属性写Bonecapture，可以平滑权重。

另一个常用的功能是权重转移，如Max Skinwrap，Maya Wrap。Houdini中虽然没有一个节点专门做这个，但是可以直接用Attribute Transfer啊，简直万能转移attribute。可见官方文档[http://www.sidefx.com/docs/houdini/character/pipeline.html](http://www.sidefx.com/docs/houdini/character/pipeline.html)

# 3 Pro and Con

## 缺点

没有GameReady Rig，Biped/HumanIK

需要自己搭建骨骼，自己设置控制器，IK/FK

没有FullBody IK，动画没有HumanIK方便

刷蒙皮有点痛苦，骨骼的配置很重要，需要保证自动蒙皮效果足够

没有Mocap和Retarget工具，当然Houdini + Mobu也是可以的选择。 不过其实，也有硬核玩家自己在Houdini里做出了Retarget  [https://www.sidefx.com/forum/topic/55681/](https://www.sidefx.com/forum/topic/55681/)

## 优点: Procedural

Houdini方便写工具和搭建Pipeline，没有做不到只有想不到和自己菜。

方便Procedural生成引擎需要的属性配置等，比如Ragdoll，布料等

Procedural整条制作Pipeline，从模型到绑定整合

# 总结

用Houdini做游戏绑定时可以的。

至于有没有必要，要看具体情况了。游戏玩法，资产数量级，制作方法，质量标准，团队水平。。。。

# Reference

[https://www.udemy.com/course/game-character-rigging-with-houdini/learn/lecture/14322906#overview](https://www.udemy.com/course/game-character-rigging-with-houdini/learn/lecture/14322906#overview)

Gdebello's practice on houdini to unity character rigging.

[https://gdebello.artstation.com/blog/l9gN/houdini-to-unity-character-rigging-experience](https://gdebello.artstation.com/blog/l9gN/houdini-to-unity-character-rigging-experience)

Bone Mirror

[https://www.sidefx.com/forum/topic/54913/](https://www.sidefx.com/forum/topic/54913/)

Official Tutorial

[https://www.sidefx.com/learn/collections/rigging-series/](https://www.sidefx.com/learn/collections/rigging-series/)

Houdini Mocap

[https://www.sidefx.com/forum/topic/55681/](https://www.sidefx.com/forum/topic/55681/)
