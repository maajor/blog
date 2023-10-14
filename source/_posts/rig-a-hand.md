---
title: Rig a Hand | 绑定一只手
date: 2020-09-20 00:00:00
---

怎么绑定一个手？也并不是那么简单，这里笔者简单记录下自己的实验的关键步骤和注意，以及整理了一些学术论文。

[https://github.com/maajor/bone-kit](https://github.com/maajor/bone-kit)

# 1 模型

需要注意布线 

经典原则是

对会扭转和弯曲的关节处给环状布线，

给可能需要变形的突起和皱褶处多一些圈数。

这样避免变形后，模型的轮廓出现明显的转折。

比如这个例子中给出的布线方向就不错。虽然手背上这样布线有点浮夸。

![Image.png](/images/Image.jpg)

[https://topologyguides.com/human-hand](https://topologyguides.com/human-hand)

 

笔者自建

![ab76f5ebe69d061aff0af89e8cd978dc.png](/images/ab76f5ebe69d061aff0af89e8cd978dc.jpg)

# 2 直接绑定

![50fa1ecdf7546be9eec0b272fd84b0c4.png](/images/50fa1ecdf7546be9eec0b272fd84b0c4.jpg)

手就是五个手指，骨骼没什么复杂的。

基本操作：可以用DCC自带的套件比如HumanIK，Biped。自己也可以自己建一套骨骼，注意轴向和旋转顺序就行。

![3525e974525d09c3d1ff5f78d0ea4819.png](/images/3525e974525d09c3d1ff5f78d0ea4819.jpg)

/

一个HIK的手部骨骼

笔者随便建了一套骨骼

![fd1ec08b6da2b13f3d90191d5fa78a45.png](/images/fd1ec08b6da2b13f3d90191d5fa78a45.jpg)

不过这样有几个问题

1. 线性混合蒙皮本身旋转插值的缺陷，导致扭曲变小等效果
2. 一些肌肉和关节会在变形后凸出，无法用权重补偿修复

当然，一种解决方法是优化蒙皮算法，比如Dual Quaternion， Direct Delta Mush等等，这里不再赘述

[https://skinning.org/direct-methods.pdf](https://skinning.org/direct-methods.pdf)

有骨骼之后，权重的生成虽然有一些自动算法，比如Maya的Geodesic，Houdini的Biharmonic，不过最终可能都需要手动调整。

[hand.blend](./file/hand.blend)

# 3 Example Based, Manual Approach | 基于案例，手工方法

我们可以使用基于案例的方法，即，给定某个姿态下的模型变形效果；让变形在目标姿势时，趋近预先给定的变形效果。

![3f89ba99a44d63aba1da3e1cb2676478.png](/images/3f89ba99a44d63aba1da3e1cb2676478.jpg)

[http://www.skinning-org.alecjacobson.com/example-based.pdf](http://www.skinning-org.alecjacobson.com/example-based.pdf)

我们可以用比较传统的方法，即让Artist来手工做出在某个姿势下模型的变形效果，然后用Corrective Blendshape的方式，在这个姿势下使用这个变形。这也就是Pose Space Deformation。

第一行 PSD

第二行 经典LBS

![e7aa9cbc5edfdf029a0a77602375a0e4.png](/images/e7aa9cbc5edfdf029a0a77602375a0e4.jpg)

[http://www.skinning-org.alecjacobson.com/example-based.pdf](http://www.skinning-org.alecjacobson.com/example-based.pdf)

当然，基于案例的思想不一定必须是输入模型的“案例”，同样可以是骨骼的方法，这只是一个思想。

比如我们可以用称为“次级骨骼”的变形，配上顶点权重的设定，来模拟模型在特定姿势下的变形。

比如这里，笔者自己写了一个工具，可以给一些次级骨骼添加约束，让它在主骨骼不同姿势下，变形到需要的位置。

![da99e1e76ccaf79ef17c246cd054ce4d.png](/images/da99e1e76ccaf79ef17c246cd054ce4d.jpg)

实现上是写了一个maya节点，做约束的解算。对于输入的姿势，使用RBF进行插值。

![d873ff7fbe787b8165ce05042ff4e2bc.png](/images/d873ff7fbe787b8165ce05042ff4e2bc.jpg)

效果上，会让掌指关节和掌丘凸起。

![psd_joints.jpg](/images/psd_joints.jpg)

这之后再加Winkle Map之类的方法，让皱纹细节随关节变形。

![57b040368702261d1109aca1d4281185.png](/images/57b040368702261d1109aca1d4281185.jpg)

这一般画个mask写个shader就行比较简单。

![6cbbff489d83cb45d3d6d9e2953e02e7.png](/images/6cbbff489d83cb45d3d6d9e2953e02e7.jpg)

除此外，为了方面Animator工作，还需要设定绑定系统控制器，建立IK和FK的控制器。

![622f81abb06326ff3b23b5c4ec4c98dc.png](/images/622f81abb06326ff3b23b5c4ec4c98dc.jpg)

本世代（PS4）游戏中基础的做法也就这样。

[http://www.skinning-org.alecjacobson.com/example-based.pdf](http://www.skinning-org.alecjacobson.com/example-based.pdf)

# 4 Example Based, Data Driven | 基于范例，数据驱动

最好是直接就有3D扫描的模型数据了，这样我们可以直接用扫描的模型作为“范例”

![c2498c4ab41790d5c70b09bdaa80b89f.png](/images/c2498c4ab41790d5c70b09bdaa80b89f.jpg)

比如在 Modeling deformable human hands from medical images 这篇文论中，提出了Weighted Pose Space Deformation的方法。它求解每个pose对应的“范例”的权重，来做不同姿势下不同范例的混合。这样它只扫了几十个模型就够了。

对游戏来说，这样可能需要存储大量blendshape，内存较大。

对游戏低模，我们可以用Wrap3套到扫描模型上。同时用“次级骨骼”代替模型的变形。

比如，SSDR（Skin Decomposition）就是一个求解次级骨骼的好方法，它可以求解出，满足输入blendshape的变形误差最小的骨骼权重与动画。比如，EA开源的Dem-Bones就是一个生成SSDR的很好的工具

[https://github.com/electronicarts/dem-bones](https://github.com/electronicarts/dem-bones)

使用Dem-Bone可以锁定部份骨骼，只求解其余的骨骼。这样我们可以手动k出对应每个扫描模型的主骨骼的pose，交给dembones生成“次级骨骼”的变形。

我们把模型变形分解到骨骼运动后，问题是下一步如何匹配到主骨骼的任意输入。

[https://www.3dscanstore.com/bundle-3d-models/ultimate-female-hand-pack-1](https://www.3dscanstore.com/bundle-3d-models/ultimate-female-hand-pack-1)

我们将"范例"姿势作为基姿势，作为可以有两种方案：

1. "人工定义" 预先定义好“基”姿势，也就扫描这些基姿势。就像FACS的做

1. "机器学习", 求解每个pose对应的“范例”权重。像Weight Pose Space Deformation一样。

第一种方案的问题是

1. 怎么人工定义基姿势，是否有可解释的意义，并使它们正交？

第二种方案的问题是

1. 可解释性比较差，比较难以让人直观理解，很难用它手K动画了。

对于第一个方案，定义基姿势的问题比较大。不同关节之间会有相关性。如果以骨骼自由度定义基姿态的话，那需要三十多个呀。

因此笔者一个不成功的尝试，最后做不下去了，因为基姿势的输入模型不够，并购造不出来基姿势。

使用的Ultimate Female Hand Pack，只有11个Pose，但是有30个左右DoF

[https://www.3dscanstore.com/bundle-3d-models/ultimate-female-hand-pack-1](https://www.3dscanstore.com/bundle-3d-models/ultimate-female-hand-pack-1)

![b140cad21d7bbd84fbb76b72827921d6.png](/images/b140cad21d7bbd84fbb76b72827921d6.jpg)

笔者用Wrap3套用的手模型，只有11个不太够

![2b2ecabbb55d22741226daa4ae35b0e6.png](/images/2b2ecabbb55d22741226daa4ae35b0e6.jpg)

一个不成功的示例，有了基姿态后就可以用滑杆控制姿势的混合。但是基姿势太少了，也分解不出来。

无论是使用“范例”权重的方法，还是基姿势的方法，我们都把模型变形分解为了一个参数向量。但这可能会对Artist带来问题，操控起来并不直观。好在，当如果有扫描模型的话，大概率也会有动作捕捉的动画方案，这样只要把动作捕捉的动画，分解到模型变形的参数空间就好了。

对于第二个方案，当然可以有简单粗暴的方式，比如模型顶点变形不需要权重，全部用神经网络生成。

相对来说一个巧妙的方案来自于MPI马普所：

Embodied Hands: Modeling and Capturing Hands and Bodies Together

在模型变形方面，它就是一个PSD的思想，依然用LBS做权重变形计算，对于不同pose用blendshape做纠正。

扫描了两千多个模型

![6966804f3df90a2c7f05b8a7b212f26f.png](/images/6966804f3df90a2c7f05b8a7b212f26f.jpg)

最终成果是一个数据模型，输入一个形状向量和一个姿势向量生成手的模型

![](https://github.com/hassony2/manopth/blob/master/assets/mano_layer.png?raw=true)

论文中从数据学习出了Pose Space Deformation得出的corrective blendshape。下图中，绿色的是带blendshape纠正的模型输出，粉色的是数据集，黄色的是corrective blendshape。

![234e669c0b68d0428a3a0b50def3db94.png](/images/234e669c0b68d0428a3a0b50def3db94.jpg)

至于姿态空间，一个PCA出来发现，6个自由度（基姿态）就能表示80%的姿态了

下图是学习出来的前十个基姿态。

![fd2bc1a82a41015f41fa5015beebdf63.png](/images/fd2bc1a82a41015f41fa5015beebdf63.jpg)

# 讨论

以上，整理了绑定一个模型，个人了解的用到的技术，以及一些成功或不成功的实验。直到今天二十年过去了，Pose Space Deformation的思想仍然很重要。

业内实践上，在本世代（PS4）中，对于脸部的绑定，已经使用了数据驱动的基于范例的方法，比如战神4中讲到的脸部绑定。而身体其它部分，主要还是手工制作的基于范例的方法。而对于贴图细节的表现，仍然是wrinklemap的做法。对于卡通角色，可能主要还是手工制作的基于范例的方法吧。而简单的场景下，直接绑定仍然是一个可行的选择。

下时代的写实游戏，有可能更多会用到数据驱动的方法，比如SMPL这类基于数据的身体参数模型。而对于风格化的游戏，使用数据驱动的方法也并非不可行，无非只是用人类Artist来制作范例嘛。主要得益于机器学习工具的普及，大家都来pytorch。

# 参考资料

Modelling a Human Hand

[https://topologyguides.com/human-hand](https://topologyguides.com/human-hand)

DemBones  [https://github.com/electronicarts/dem-bones](https://github.com/electronicarts/dem-bones)

Skinning: Real-time Shape Deformation ACM SIGGRAPH 2014 Course

[https://skinning.org/](https://skinning.org/)

Lewis, John P., Matt Cordner, and Nickson Fong. "Pose space deformation: a unified approach to shape interpolation and skeleton-driven deformation." _Proceedings of the 27th annual conference on Computer graphics and interactive techniques_. 2000.

Kurihara, Tsuneya, and Natsuki Miyata. "Modeling deformable human hands from medical images." _Proceedings of the 2004 ACM SIGGRAPH/Eurographics symposium on Computer animation_. 2004.

Romero, Javier, Dimitrios Tzionas, and Michael J. Black. "Embodied hands: Modeling and capturing hands and bodies together." _ACM Transactions on Graphics (ToG)_ 36.6 (2017): 245.

%!(EXTRA markdown.ResourceType=, string=, string=)

Controllable Hand Deformation from Sparse Examples with Rich Details

[https://www.researchgate.net/profile/Kangkang_Yin/publication/220789184_Controllable_Hand_Deformation_from_Sparse_Examples_with_Rich_Details/links/00b7d51aef46b4b896000000/Controllable-Hand-Deformation-from-Sparse-Examples-with-Rich-Details.pdf](https://www.researchgate.net/profile/Kangkang_Yin/publication/220789184_Controllable_Hand_Deformation_from_Sparse_Examples_with_Rich_Details/links/00b7d51aef46b4b896000000/Controllable-Hand-Deformation-from-Sparse-Examples-with-Rich-Details.pdf)

Embodied Hands:

Modeling and Capturing Hands and Bodies Together

[https://mano.is.tue.mpg.de/](https://mano.is.tue.mpg.de/)

[https://www.is.mpg.de/uploads_file/attachment/attachment/392/Embodied_Hands_SiggraphAsia2017.pdf](https://www.is.mpg.de/uploads_file/attachment/attachment/392/Embodied_Hands_SiggraphAsia2017.pdf)

[https://skinning.org/](https://skinning.org/)
