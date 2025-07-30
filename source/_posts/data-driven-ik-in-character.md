---
title: Data-Driven IK in Character| 角色中的数据驱动反向动力学
date: 2020-05-24 00:00:00
tags:
  - Animation
  - Technical
  - Game Development
  - Machine Learning
  - Research
  - Character Animation
---

[Github Codebase](https://github.com/maajor/latent-pose)
<video width="640" height="480" controls>
  <source src="/images/demo.mp4" type="video/mp4">
</video>

读论文写代码有感，当我们从隐空间的角度看待动画，很多动画的机器学习算法的原理就比较好理解。以及IK，传统的方法可以看成是机器学习方法的近似和简化。

动作数据在引擎内显式表示为每根骨骼的TRS（位移旋转缩放)。这样来看其维度（自由度）是12*NJoints。即4x4其次矩阵去掉最后一行。如果只有旋转是3*Njoints(Axis-Angle表示下）

一个观察是，这个维数是不大的，就算100跟骨骼旋转，这才300个维度。相比于图片和模型处理动不动上百万的维度，已经相当好训练和运行了。因此动画中应用机器学习进展的相当快。比如最近几年比较火的motion matching, RL生成动画等等。

另一个观察是，这么多维度中，

- 各个维度不是相互独立的，而是有相关性，结构化的。比如，手传进身体的姿势中，各个关节局部的姿势是可能的，但是整体上是不可行的。
- 各个维度有合理的取值范围。比如膝盖关节不能反向旋转，而且可以认为只有一个自由度

于是这就转化成一个机器学习问题了：怎样表示出数据的结构？如何用低维（下文称为隐变量空间）来表示数据？用低维数据之后会有什么应用？

# 1. 背景技术
首先我们看几个技术

## 1.1. Motion Matching

我们把动画表示为隐空间，同时这些隐空间维度就是用户输入。这样运行时我们可以通过隐空间中搜索最优解获得下一个动画片段。

这里隐空间维度可以有比如方向，速度，姿态，脚步位置等等。

学术界很早就有相关的研究

工业界第一次见到是UbiMTL在荣耀战魂中的应用

[https://www.gameanim.com/2016/05/03/motion-matching-ubisofts-honor/](https://www.gameanim.com/2016/05/03/motion-matching-ubisofts-honor/)

回忆下传统动画的方式

1. 制作一些动画片段，设定一些参数作为状态机参数。参数比如可以是方向，蹲下，战斗动作等等。

2. 运行时引擎根据用户输入改变的参数，运行状态机将动画混合到合适的片段。

和motion matching的区别主要是

1. 参数设定上，Motion Matching是标记mocap数据。传统方法是根据经验预先定义，然后手动制作动画片段

2. 动画片段的长度上，Motion Matching可以把动画片段打碎到很细的粒度，而传统动画需要制作较长的循环动画

3. 动画选择上，Motion Matching根据输入参数自动搜索。传统方法需要预先定义状态机，定义动画跳转方式。

## 1.2. PFNN

Daniel Holden的一篇用PFNN作为角色控制器的论文。它的特殊之处在于，生成动画（骨骼数据）的神经网络的权重有一个相函数影响。

当然，神经网络的输入还包括一些输入变量，比如关节速度，高度，方向等等。相函数是脚步的相位决定的。

![pfnn.png](/images/pfnn.jpg)

它相比于纯神经网络生成的动作，多一个相函数，考虑了双足脚运动相位的影响。

相比于motion mathing，没有动画片段的概念了，所有动画数据都被编码在神经网络权重中。

用隐空间的角度来理解，双足相位加上类似motionmationg的运动维度，就是这个隐空间的维度了。

## 1.3. Style IK

Siggraph 2004的文章 Style-Based Inverse Kinematics

基本思想是使用SGMLVM的方法，用隐空间表示pose，学习出pose的分布密度函数。这样用一些动作集训练后分布后，再从其中采样，就可以获得合理的pose。以此为IK，求解约束条件下，隐空间中几率最高的pose，也就是ik了。

![styleik.png](/images/styleik.jpg)

## 1.4. Skin Decomposition

想解决的问题是用骨骼模拟一系列顶点的运动。所以我们需要求解骨骼的权重，初始位置和动画位置，找到最佳拟合。

![](https://app.yinxiang.com/shard/s5/res/4ff4ff39-98dd-4d0f-997f-067b892154af.jpg)

回顾一下这个问题，它已经给了loss function的表述了，我们完全可以用机器学习梯度下降来解它嘛。

从另一个角度来理解，他就是想给数据做降维，用隐空间表述一个全集。

## 1.5. SMPLify-X

这是一个单目人体姿势估计的问题。

除去CV检测关节点的部分外，另外一个问题是，怎么从2D位置估计出骨骼的3D位置？

![smplx.png](/images/smplx.jpg)

关于这个问题，我们是有先验知识的。人体的关节姿态不是任意的，而一定是服从某种分布的。

StyleIK中也涉及了这个问题，当我们知道人体姿态的分布后，就容易从2D点推断出姿态了。

SMPLX论文中，则是训练了一个变分自编码器(VAE)，称之为VPoser，学习出动作空间的分布，并用隐变量表示。这就可以用在姿态预测的优化过程中了。

# 2. Classic IK

一个广义的IK定义是，寻找满足约束条件的骨骼pose。以此定义，motion matching，PFNN，skin decoposition, VPoser这几个，都可以认为是IK。

而一个狭义的IK定义是，给定终端节点（End Effector)的位置或旋转等，求解中间骨骼的姿态。游戏引擎中常见的手脚IK，机械臂的终端IK都是这类问题。

根据Aristidou的综述，我们可以吧IK问题分成几类：解析式的，数值式的，数据驱动的和混合式的。我们在游戏引擎中见到的基本都是数值式的方法。其中三个经典的：

## 2.1. Jacobian Based

最经典的IK方法。Jacobian方法可以直观理解为求解一阶导数，当我们求解出一个运动系统的偏导数后，就可以根据导数方向改变姿态接近目标，这也就是JacobianIK的原理

![jacobian.png](/images/jacobian.jpg)

这个示意图可以看出，它只是一个一阶导数的近似。不过对于实时运动来说，一般也就够了。

## 2.2. CCD

![CCD.png](/images/CCD.jpg)

CCD是一种简单的迭代IK求解器，每次只改变一个关节的旋转逼近目标。

## 2.3. FABRIK

![fabrik.png](/images/fabrik.jpg)

FABRIK是另一种简洁的IK求解器，不同于CCD，它更新的是节点的坐标，此外多了一份从根节点开始的pass，有正反两个pass更新坐标。

## 2.4 讨论

以上基本就是游戏引擎中常用的IK求解方法了。工业界基本都是这个原理了，比如我们在Unity插件FinalIK中就都有这几种IK的实现。

我们可以看到，如果把IK作为一个loss function的话，这些解法都是在尝试模拟梯度下降。比如Jacobian中，计算一阶偏导，就是近似计算梯度下降。CCD和FABRIK中用的贪心的方法，迭代求解的每一步都在计算局部最佳梯度。

像极了实时图形学中各种模拟的trick。不完全正确，但我们考虑的不是正确与否而是好坏。

所以这样做的目的是什么？

    - 快速。达到实时要求。

有什么代价？

    - 当然有，IK计算会产生错误。

错误在可接受范围内，或者错误重要吗？

    - 大部分情况下可接受，肯定有corner case

# 3. Data-Driven IK

我们再次从机器学习角度考虑狭义的IK这个问题，即，怎么让关节达到目标位置。

面对这个优化目标，我们当然可以直接对关节旋转做梯度下降。不过，这样会有个问题。我们可以保证姿态达到目标，但是怎么保证姿态是合理的？

StyleIK和VPoser给出的思路是，我们预先训练模型学习出姿势的分布，然后找到满足IK要求的姿态中，最合理的一个就好了。

至于怎样学习出姿势的分布？有很多种方法啦。StyleIK用的一个Scaled Gauss Process Latent Variable Model，将姿态转换到隐空间分布。在这个隐空间中是一个高斯分布，因此可以采样出姿态的概率。VPoser训练了一个VAE，思想也是将姿态编码到一个隐空间中，之后就可以从这个隐空间中采样姿态。VAE中隐空间参数满足高斯分布，也因此可以得到参数概率的高低。

我们将隐空间参数的概率作为loss function的一项，参与到IK梯度下降迭代求解中，就相当于能找到即满足IK要求又合理的姿势了。

# 4. Implementation

具体到代码上，我们怎么实现呢？

## 4.1 Pose表示

首先数据来源于CMU Mocap Data，我们需要把bvh数据表示为关节旋转数据。

我们可以用任意DCC软件，笔者这里直接选择使用blender了。导入bvh数据后就可以导出关节的旋转数据了。

我们翻一下Blender的文档，可以看出它有Bone和PoseBone两个类型。

[https://docs.blender.org/api/current/bpy.types.PoseBone.html](https://docs.blender.org/api/current/bpy.types.PoseBone.html)

[https://docs.blender.org/api/current/bpy.types.Bone.html](https://docs.blender.org/api/current/bpy.types.Bone.html)

前者可以理解为RestPose，而后者是带动画的状态。我们从posebone中使用matrix_basis属性就可以拿到局部坐标系下的旋转数据了。

大概如下：
```
anim_data = np.zeros((len(keys)-1, len(mapping.keys()),3,3))
for f in range(1, keys[-1]):
    sce.frame_set(f)
    for pbone in armature.pose.bones:
    mat_local = np.array(pbone.matrix_basis)[:3,:3]
    pbone_id = mapping[pbone.name]
    anim_data[f-1,pbone_id,:,:] = mat_local
```
当然到此只能处理一个BVH文件，我们要让blender批处理导入到处，用命令行模式就行

注意命令行模式python脚本可以接受到argument的，所以我们可以批量执行

blender --background -P data/bpy_import_bvh_and_convert.py --bvh <path-to-bvh-file>

## 4.2 Pytorch中骨骼变换

参考SMPL-Torch中的写法，不过我们只需要骨骼变换不需要蒙皮等等操作。另外SMPL中不关心单个骨骼的局部坐标系，每根骨骼的坐标系都认为是世界XYZ。我们不能这样简化，因为我们在DCC中需要拿到的是骨骼局部坐标系下的旋转。

回顾变换的原理，其中poseLocalRotation是特定姿势下局部旋转

boneObjectTransform = parentObjectTransform * boneRestLocalTransform * poseLocalRotation

boneRestLocalTransform这项可以在blender里通过
bone.parent.matrix_local.inverted()@bone.matrix_local 拿到。

这里需要注意的是，它bone.matrix和bone.tail和bone.head没太搞清楚怎么能计算出这个局部变换，但反正我们可以用上面方法整体计算就好了嘛。

所以pytorch里面

parent是一个父子骨骼id表，我们只要保证每一个骨骼的父骨骼id比自己小，就能遍历所有骨骼id求出所有骨骼的objectTransform。这是因为，计算到某根骨骼时，它父骨骼id比它小，所以已经计算过了，就可以拿出来算自己的变换了。

这里J就是每个骨骼的restLocalTransform

localRot是一个nnParameter，表示骨骼旋转角度，它在pytorch中设为可微的。
```
root = torch.matmul(J[:,0], localRot[:,0])
results = [root]
for i in range(1, self.kintree_table.shape[1]):
    localTransform = torch.matmul(J[:, i], localRot[:,i])
    objectTransform = torch.matmul(results[parent[i]],localTransform)
    results.append(objectTransform)
```
## 4.3 训练

数据只用了CMU Mocap Data的01-09这几个类别，算下来有80k的pose作为训练集，20k测试集，10k验证集。

RTX2070上训练，一个Epoch不到1分钟。初始lr1e-2, 200个Epoch基本效果就差不多了，loss到0.3.

最后模型大小是2.9M，当然其中可能超过一半的参数都在encoder中，我们预测只需要decoder，也就是说还有很多压缩的空间。

## 4.4 预测阶段

我们希望Blender拿过来的参数包括目标骨骼ID和目标骨骼位置，预测出每个骨骼的旋转值和根节点位移。

我们固定一个lr=2e-1, 迭代次数100，基本都能达到一个比较好的效果。优化部分核心代码如下，可以看出loss function是两部分：1. 骨骼节点位置的距离 2. 姿势隐空间变量的概率。因为隐变量是中心为0的高斯分布，我们直接平方出来可以近似一个概率密度的。

```
for it in range(0, iteration):
        optimizer.zero_grad()
        joint_pos_predicted = model.forward()
        loss = F.mse_loss(joint_pos_predicted*joint_mask, joint_pos*joint_mask) + 1e-3 * model.pose_embedding.pow(2).sum()
        loss.backward()
        optimizer.step()
```

当然，减小lr，提高迭代次数可以让结果变精确，不过当前这套参数表现也差不多，速度CPU上运行一次计算大约1.2s左右。

## 4.5 Server-Blender 

下一个问题是，blender里怎么用pytorch？

当然有人直接能把pytorch装在blender里，不过配环境可太麻烦了。

这里我们直接部署一个flask服务器，开放一个RESTFUL API给blender调用就好了。

当然坏处是增加了通信和数据解析的成本，不如blender直接带pytorch这样全是内存数据交换。不过对我们也够用了。

一个10行极简的框架就这样，用全大写表示伪码的部分
```
app = Flask(__name__)

INITIALIZE_MODEL

@app.route('/predict', methods=['GET'])
def predict():
    if request.method == 'GET':
        PARSE_REQUEST_DATA
        RETURN PREDICTED_DATA

if __name__ == '__main__':
    app.run(port=1028)
```
为什么这里使用Vposer？因为它有源码我们可以借鉴。

# 5. 讨论

这种技术的应用场景在哪里？实时的话太慢了，生产的话大部分动画都能动捕，还需要IK做什么呢？

看上去只能用在手工Keyframe动画，用于无法动捕的动画生产。比如不好动捕的动作，或者风格化的动作。这里又会产生两个问题：

如果不好动捕的动作要应用，那么训练数据从哪里来？毕竟，Data-Driven IK是要训练一个隐空间分布的。这好像是一个先有鸡还是先有蛋的问题。笔者的意见是，还是得先有人制作动画，作为训练数据（人造鸡）。然后再有蛋（Data-Driven IK)，后面就可以有各种自动鸡了。

对于风格化动作的生成，当然一种方法是，直接用风格化数据训练，比如本文这样。另一种方法是迁移学习，训练一个style transfer的模型，直接把动捕数据迁移成风格化的数据。后一种方法仿佛更可行，毕竟动捕数据可以认为是无限的啊，但是风格化动作生产可就太费劲了。

这样一看，好像也就只能用于二手生产，没啥其它用。引申一下，这就是机器学习对于图形学应用的一个重要障碍。

图形学，或者说艺术中的一个问题是“创造”。机器学习能做的是举一反三。生成式模型（VAE, GAN)通过学习很多数据，来生成符合学习过的数据分布中合理的插值或者外推的数据。但目前看，它还不能“举一”，或者说“举一”的效果和人类艺术家相比相差甚远。

以及，很多情况下，直接让人类艺术家创造出的东西，比机器学习创造的更加可控，更加合理，更加便宜。那用机器学习的意义在何？

# 6. 参考资料

Grochow, Keith, et al. "Style-based inverse kinematics." _ACM SIGGRAPH 2004 Papers_. 2004. 522-531.

Aristidou, Andreas, and Joan Lasenby. "FABRIK: A fast, iterative solver for the Inverse Kinematics problem." _Graphical Models_ 73.5 (2011): 243-260.

Aristidou, Andreas, et al. "Inverse kinematics techniques in computer graphics: A survey." _Computer Graphics Forum_. Vol. 37. No. 6. 2018.

Canutescu, Adrian A., and Roland L. Dunbrack Jr. "Cyclic coordinate descent: A robotics algorithm for protein loop closure." _Protein science_ 12.5 (2003): 963-972.

Pavlakos, Georgios, et al. "Expressive body capture: 3d hands, face, and body from a single image." _Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition_. 2019.

Holden, Daniel, Taku Komura, and Jun Saito. "Phase-functioned neural networks for character control." _ACM Transactions on Graphics (TOG)_ 36.4 (2017): 1-13.

[https://www.gameanim.com/2016/05/03/motion-matching-ubisofts-honor/](https://www.gameanim.com/2016/05/03/motion-matching-ubisofts-honor/)

[http://www.andreasaristidou.com/FABRIK.html](http://www.andreasaristidou.com/FABRIK.html)

VPoser https://github.com/nghorbani/human_body_prior

SMPL-torch https://github.com/CalciferZh/SMPL