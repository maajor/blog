---
title: Hair Rendering and Modelling – An Intro | 头发渲染与建模 – 简介
date: 2019-03-31 00:00:00
tags:
  - Graphics
  - Rendering
  - Game Development
  - Technical
  - Modelling
---

# 20190331 Hair Modelling and Rendering

[Github Codebase](https://github.com/maajor/Marschner-Hair-Unity)
![Hair2_2.png](/images/Hair2_2.jpg)

# 1 渲染

## 1.1 Kajiya-Kay

最早研究毛发渲染的便是Kajiya和Kay，他们在1989年提出了Kajiya-Kay模型。这也成为了实时图形学的标准方法，甚至在30年后的今天，大量游戏的头发还是使用的这个模型。Jim Kajiya应该是个日裔，他在Utah大学完成的博士学位，目前还在微软研究院工作。他因为对毛发渲染做出的突出贡献，获得了1997年的奥斯卡技术贡献奖。

在游戏中使用这个模型还要追溯到GDC2004的Hair Rendering and Shading这个Talk，主讲者Thorsten Scheuermann来自AMD。PPT中比较详细地描述了kajiyakay模型和一些hacking技巧

![Image.png](/images/Image.jpg)

最重要的一点是用Tangent计算高光。

另外用一张径向噪波来偏移tangent，获得高光的一些变化。并且参考Marschner的观察，加了第二层高光。

![f6576fa35da5b37e78e16b39e4243884.png](/images/f6576fa35da5b37e78e16b39e4243884.jpg)

PPT中还讲到了排序的问题，提出了多个pass，先alpha-test写入z，再渲染blend的操作。

移动平台上还是用的相近的方法，不过在主机上大多流行TAA+dither了。

## 1.2 Marschner

Thorsten Scheuermann的文章中提到了Marschner的论文，不过只是唯象提到了两层高光的效果，并没有参考Marschner的光照模型。真正用到Marschner应该还是从离线渲染开始的。在2016年才由Epic公开了实时的做法。

Physically Based Hair Shading in Unreal

官方示例Realistic Character中便用了这个光照模型。

论文最主要的贡献是从微观模型角度对毛发的光照做了分析，并用设备测量了光照的分布，和模拟结果对比证明建模很有效。

把头发的微观模型抽象成了一节一节的圆柱。

![f9422471472620eed7ebeeab4ca3ca67.png](/images/f9422471472620eed7ebeeab4ca3ca67.jpg)

提取了三个Path 逐一分析：R直接反射，TT两次投射，TRT投射内部反射投射

最终计算时候也是三项加起来作为最终结果。

直观上看，R就是第一层高光，TRT就是第二层高光，TT是背面看的高光

其中每个路径都是三项乘起来：M*N*A，M是轴向的散射lobe，N是径向的散射lobe，A是吸收和反射。

A项可以用菲涅尔参数计算出来。

![d69503db42e19b0e38c9904719bd5830.png](/images/d69503db42e19b0e38c9904719bd5830.jpg)

具体计算时，M项简化成了一个高斯分布函数

![fbeae26dd784336c0c320dc5105e467b.png](/images/fbeae26dd784336c0c320dc5105e467b.jpg)

带了一个角度的shift，这个作者用了一组magic number，大概是这个参数的模拟和测量比较近似吧。

N项解了一个方程....还挺复杂的

另外还建模了离心性，有些头发不是圆柱的而是椭圆的，会造成折射率的变化

![447c448140f489f6511b969fee9d3ba0.png](/images/447c448140f489f6511b969fee9d3ba0.jpg)

代码可见，笔者在Unity中的实现，受限于引擎本身，可能少了一些feature.

[https://github.com/maajor/Marschner-Hair-Unity](https://github.com/maajor/Marschner-Hair-Unity)

## 1.3 d'Eon

Weta对Marchner的改进，主要侧重于能量守恒。

## 1.4 Epic的实现

Epic在实现的时候首先参考了d'Eon的实现，这个是Weta的做法，相比于Marschner的改进是考虑了能量守恒。

但是太复杂了，还是使用了Marschner最开始提到的的高斯分布，

![54ca0b391479be6752ee74e0b1f11b45.png](/images/54ca0b391479be6752ee74e0b1f11b45.jpg)

径向散射R项直接用了Weta的做法

![03d82f8f65fc2ab4d8509b9a1586e04d.png](/images/03d82f8f65fc2ab4d8509b9a1586e04d.jpg)

对于其它的很多项，离线渲染的方程都太过复杂了！！

作者的做法是：用简单函数拟合！比如径向散射TT做了个函数的拟合

![3fae4518b1a161051f3008dd23071ba9.png](/images/3fae4518b1a161051f3008dd23071ba9.jpg)

径向TRT也是一样的。

还讲到了MultiScatering.....猥琐了一下并不是很物理

环境光的处理用了一个假法线方向，同样的BRDF。

UE大部分的代码都实现了，唯独没有实现eccentricity，这在Marchner论文里讲到了。这部分笔者实现了一下。

## 1.4 Fur 

短毛上也可以啊！不过有点差别

[Yan 2015]这个论文把微观模型搞得更复杂了一点

![710be112a449a2a5078856938cd6f2f5.png](/images/710be112a449a2a5078856938cd6f2f5.jpg)

毛发中间有一个medulla硬核，所以路径积分应该会是R,TrT,TttT,TtrtT,TttRttT很多很多。。。

Disney在Hyperion里做了点改进，就是N项不用复杂积分了，直接pathtracing完事。所以变快了。

# 2 制作

## 2.0 模型

很多手游里头发还是模型体的做法，而不用插片。贴图也是用一个径向模糊的图jitter tangent，使用kajiya-kay模型，这里便不再赘述。

## 2.1 插片

实时中使用的话，主机上常见的做法还是插片，有很多的插件可以做了，比如Ornatrix, Hairfarm, Maya XGen等等。笔者这里试用了一下Ornatrix。

笔者总结的一些bestpractice：

1 自动生成的guide不好控制，还是得手动种guide

2 guide最好提前分好组，同样长短粗细的strand归成一组，方便后面贴图uv

3 用刷子的时候最好只对选择的guide起作用，太容易误刷了。

基本操作笔者看的这个time lapse：从建模到贴图全套

[https://vimeo.com/271493226](https://vimeo.com/271493226)

另外一个有名的是在CGMA的一个课Hair Creation for Games，最近很多80.lv上的文章都是这个课的学生作品

[https://www.cgmasteracademy.com/courses/48-hair-creation-for-games#section-instructors](https://www.cgmasteracademy.com/courses/48-hair-creation-for-games#section-instructors)

![4177fb2acf53459737768e0234cbf119.png](/images/4177fb2acf53459737768e0234cbf119.jpg)

## 2.2 贴图

在游戏里的传统做法还是做头发的贴图Atlas，预先做集中strand，然后把guide烘出来的头发uv映射上去，每一个组对应一块uv

![ab118a6ea923272a2d44e6ded96d07cd.png](/images/ab118a6ea923272a2d44e6ded96d07cd.jpg)

笔者这里用SubstanceDesigner烘焙的，一个id，一个深度，一个root，一个flowmap。

root是用uv烘了一个渐变贴图

Ornatrix可以直接导出时候用tangent作为法线，所以比较好烘。

跟UE里区别是多一个flowmap，如果有卷发的时候还是需要这个图的。

![Hair2_Property.jpg](/images/Hair2_Property.jpg)

## 2.4 TressFX/HairWorks

这个就比较非传统了，不用做插片，都是guide就行。这里就不详述了。

## 2.5 Deep Learning + 

最近几年一直有人在研究用计算机视觉建模头发，这两年深度学习重新带火了这个领域，比如去年的3D hair synthesis using volumetric variational autoencoders

训练了一个autoencoder通过图片生成模型。

![33102db81c6da9fb982a3984ca5c82f3.jpg](/images/33102db81c6da9fb982a3984ca5c82f3.jpg)

也比较神了虽然不是游戏里直接能用的模型，但至少还是可以减少很多手工建模的工作量的。

![Hair2_4.png](/images/Hair2_4.jpg)

![Hair2_3.png](/images/Hair2_3.jpg)

Kajiya, James T., and Timothy L. Kay. "Rendering fur with three dimensional textures." ACM Siggraph Computer Graphics. Vol. 23. No. 3. ACM, 1989.

GDC2004 Hair Rendering and Shading

[http://web.engr.oregonstate.edu/~mjb/cs519/Projects/Papers/HairRendering.pdf](http://web.engr.oregonstate.edu/~mjb/cs519/Projects/Papers/HairRendering.pdf)

Marschner, Stephen R., et al. "Light scattering from human hair fibers." ACM Transactions on Graphics (TOG). Vol. 22. No. 3. ACM, 2003.

d'Eon, Eugene, et al. "An energy‐conserving hair reflectance model." _Computer Graphics Forum_. Vol. 30. No. 4. Oxford, UK: Blackwell Publishing Ltd, 2011.

Physically Based Hair Shading in Unreal

[https://blog.selfshadow.com/publications/s2016-shading-course/karis/s2016_pbs_epic_hair.pptx](https://blog.selfshadow.com/publications/s2016-shading-course/karis/s2016_pbs_epic_hair.pptx)

Yan, Ling-Qi, et al. "Physically-accurate fur reflectance: modeling, measurement and rendering." _ACM Transactions on Graphics (TOG)_ 34.6 (2015): 185.

Chiang, Matt Jen‐Yuan, et al. "A practical and controllable hair and fur model for production path tracing." _Computer Graphics Forum_. Vol. 35. No. 2. 2016.

Saito, Shunsuke, et al. "3D hair synthesis using volumetric variational autoencoders." _SIGGRAPH Asia 2018 Technical Papers_. ACM, 2018.
