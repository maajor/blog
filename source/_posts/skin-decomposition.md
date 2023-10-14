---
title: Skin Decomposition | 蒙皮分解
date: 2019-02-14 00:00:00
---
# 20190214 Skin Decomposition | 蒙皮分解

想解决的问题是：已知一连串顶点运动的动画，能不能用骨骼动画把它表示出来？

比如，一个动补的脸部动画？一个离线模拟的布料？

1. Intro

一个直觉的想法是，这不就是降维嘛。顶点运动的很多数据是相关的，比如相近两点的运动会比较接近。所以应该有办法压缩它们，就像PCA主成分分析一样，找到影响顶点最重要的维度就行了。

自然学术界已经有很多研究了。自然首先推荐ACM SIGGRAPH 2014 Course, Skinning: Real-time Shape Deformation

[http://skinning.org/](http://skinning.org/)

主持人是Dual Quaternion的提出者Kavan大神

第四部分就是讲蒙皮分解，也就是本文想解决的问题。讲义中提到了SMA，FSD，SSDR三种方法。嗯FSD也是Kavan提出的

另外这个Course其它几讲也很有参考价值，比如如何自动rigging。。。。

工业上也是有一些解决方案，比如

Hans Godard's Skinning Converter

[http://www.cgchannel.com/2015/10/hans-godard-releases-skinning-converter-for-maya/](http://www.cgchannel.com/2015/10/hans-godard-releases-skinning-converter-for-maya/)

不确定采用的哪种方法。

Houdini Skinning Converter

[https://www.sidefx.com/tutorials/game-tools-skinning-converter/](https://www.sidefx.com/tutorials/game-tools-skinning-converter/)

目测类似于SMA的方法，直接指定骨骼初始位置然后计算一次权重和骨骼每帧位置，笔者和SSDR做了对比，可以说Houdini这个确实比较差。

1. Smooth Skinning Decomposition with Rigid Bones

2012年的这篇论文可以说是Skin Decomposition的经典文章了

其核心就是想最小化一个目标函数，求解出权重和骨骼的坐标。

![6625305f18dff5601502aa741d09e45d.png](/images/6625305f18dff5601502aa741d09e45d.png)

目标函数2a中，Rtj是骨骼j在t帧的旋转，Tij是骨骼j在t帧的位移，pi是顶点i的初始位置，wij是骨骼j对顶点i的权重，vti是顶点i在t帧的坐标。

所以直觉来看这个目标函数，就是每个顶点经过骨骼变换位置与实际位置的偏差咯！

2c是权重条件，即每个顶点的骨骼权重和为1

2d是权重稀疏条件，即每个顶点的最大骨骼数量为K

2e为旋转条件，即Rtj这个矩阵是正交

![d103bfe72596bbf62464719b17cd6c28.png](/images/d103bfe72596bbf62464719b17cd6c28.png)

那么算法分三步

1. 初始化
2. 每步更新权重
3. 每步更新骨骼位置

1 初始化

初始化会先用kmean把顶点聚类一下，然后用Kabsch算法找到旋转值

2 每步更新权重

更新权重时候固定骨骼位置，所以这就简化成了一个计算一组W，使得骨骼变换后的顶点到原始顶点距离最小。

![23dafdf3d2bba27a34e71da161779208.png](/images/23dafdf3d2bba27a34e71da161779208.png)

所以这就是一个带限制条件的线性回归最小二乘问题啊！

作者说用一个ASM算法就行，但它比较慢所以作者进行了什么优化blabla

3 每步更新骨骼位置

更新骨骼位置。这时候权重固定了，那其实每帧都是独立的，我们对每帧进行计算就行。同时为了保证优化函数非增，我们一根骨骼一根骨骼更新。

对每帧每根骨骼，固定其它骨骼。

这里qi反正它跟其它骨骼相关，在这里是个常数。要解的就是后面那项，对这根骨骼的R和T

![591a7c6485a8ca16baa5ea0057b049a6.png](/images/591a7c6485a8ca16baa5ea0057b049a6.png)

作者说这很像一个Weighted Absolute Orientation问题。受Kabsch算法启发，先把顶点移到重心，然后求解一个最优旋转R，再计算最优位移T。

Kabsch算法方便的是通过一个SVD分解就能比较容易地计算出。

最后讲了讲就是这个算法可能有点慢但是效果很好啊！

纵观这个论文，目标其实很简单，然后分而治之，迭代对每一部分优化求解，求解过程各种神奇算法。笔者想，但是没有实践，为什么不用梯度下降求解？？

1. Implementation

笔者当然没有自己写代码实现。有现成的源码

[https://github.com/dalton-omens/SSDR](https://github.com/dalton-omens/SSDR)

这个是python的实现，笔者尝试了一下在houdini里用它计算，不知道是代码的问题还是houdini的问题，效果对某些变形是好的，但对某些有bug

笔者最后用的这个

[https://github.com/TomohikoMukai/ssdr4maya](https://github.com/TomohikoMukai/ssdr4maya)

C++的实现，比上面python那个快很多，而且效果准确。

1. Practice

自然是用布料了!

试试Houdini 17的Vellum吧！

官网就有[https://www.sidefx.com/tutorials/november-thug-vellum-with-sara-rascon/](https://www.sidefx.com/tutorials/november-thug-vellum-with-sara-rascon/)

只不过它没有舞者动画的数据

舞者动画找了一个动捕的数据，CMU Mocap Lab就有跳舞的数据。不过官网上那个没有TPose没法用。好在有前人整理过这些数据。

[https://sites.google.com/a/cgspeed.com/cgspeed/motion-capture/cmu-bvh-conversion](https://sites.google.com/a/cgspeed.com/cgspeed/motion-capture/cmu-bvh-conversion)

下载下来第0帧是Tpose，并且骨骼命名可以直接被MotionBuilder识别。

用Vellum示例文件里的角色在Maya里绑定一下，然后导入MotionBuilder做Retarget

发现动作有好多抖动，于是在MotionBuilder里修一下动画。之后导入Houdini就可以模拟Vellum了！

之后从Houdini里导出Alembic，导进Maya里用ssdr4maya转一下，200帧200根骨骼，大概要一个多小时。

![03a796148b2cab66142e74845f2bd6ad.png](/images/03a796148b2cab66142e74845f2bd6ad.png)

保留了不少布褶

![9c2ca6afe68302b30120816761929beb.png](/images/9c2ca6afe68302b30120816761929beb.png)

对比一下原始模拟

最后导入UE设置材质灯光！

不过动画的压缩有点问题，有些帧顶点跳了，暂不清楚如何解决。

![43ac9ccc93013732e308e94bd3332125.png](/images/43ac9ccc93013732e308e94bd3332125.png)

Le, Binh Huy, and Zhigang Deng. "Smooth skinning decomposition with rigid bones." _ACM Transactions on Graphics (TOG)_ 31.6 (2012): 199.
