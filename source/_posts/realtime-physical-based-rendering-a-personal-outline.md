---
title: Realtime Physical Based Rendering, a Personal Outline | 实时基于物理的渲染-个人的大纲
date: 2020-08-09 00:00:00
---

什么是Physical Based Rendering? PBR到底包含什么？

一般离线渲染中PBR包含内容很多，从材质到灯光到曝光等。但是，在很多游戏PBR教程中从microfacet model，BRDF, 材质属性，辐照度开始讲，有时候也只讲材质。个人感觉对于新手来说很容易一下就掉入细节中，感到挫败和丧失兴趣。同时比较肤浅，没有考虑到PBR的各个方面。

由于实时计算机图形学有着硬件性能的限制，导致对于PBR不像离线有蒙特卡罗路径积分等统一的方法，而是对于各种特殊问题都有很具体的特殊解法，也更造成容易掉入细节中。

笔者这里尝试从光路开始分析，不用数学公式。从直观角度描述基本概念，讲解PBR有什么问题，在实时领域是怎么解决的？从而让读者快速得到一个宏观图景。

1. 渲染方程

尊重一下历史，我们从最著名的Kajiya渲染方程讲起。

一个非常暴力的简化：渲染方程讲了一件事：我们看到的光线，可以分解成哪些部分？

忽略掉积分，可以写成这样一个形式：

Lo = Le + Li * Fd, 

翻译成人话。看到的光（图Lo) = 物体表面发射的光 + 物体表面受到的光(图Li)*物体反射光的能力(图Fd, 常称为BRDF)

![path_brdf.png](/images/path_brdf.png)

这就很好办了，我们只要知道了光源Li（物体表面的受光情况），以及材质Fd（反射光的能力如何，BRDF），就能渲染了！

1. 材质与光路

材质反射光的能力如何?

我们对于进入材质的光路逐一分析

![path_medium.png](/images/path_medium.png)

给它们起个名字：

- S, Specular, 光线在物体表面就反射
- D, Diffuse，光线折射进入浅层表面就被反射，这个深度几乎可以忽略不计，所以一般认为是在表面
- SS, Subsurface Scattering, 光线折射进入深层表面就被反射（散射）了
- TS, Transmission Scattering, 透射过程中发生了散射
- T，Transmission，透射过程中又穿出去了
- A, Absorption，光线被吸收了

这些项就是光线所有的可能性。它们加起来总和等于入射光。那么上文说的BRDF，我们可以拆解成每一项都有BRDF。

注意的是，出射方向只表示一种可能性，不代表必然发生。

不同材质中，这些每一项的占比是不同的，几个例子：

- 铝板，只有S和A
- 木板，S和D占绝大多数
- 牛奶，SS+S+D占绝大多数
- 毛玻璃，TS为主，其他几项都有

我们可以对材质进行分类：

- **不透明 vs 透明 vs 半透明，**前者不会有SS，TS和T项
- **金属 vs 非金属****，**前者只有S和A，进入表面的全被吸收。后者每一项都有可能。前者的S项会对不同波段不一样，造成彩色高光。而后者的S项是均一白色的。

那么最简单的情况，只考虑不透明材质。那么光路就很好办，只有**Diffuse vs Specular�**�两项。

![d34595f576e6eb6eb93448f7ec469f72.png](/images/d34595f576e6eb6eb93448f7ec469f72.png)

人们发现，可以在模型中把金属和非金属结合起来，用一个统一的模型描述它。这样有金属度的参数我们就能统一不透明物体的公式。

有统一模型当然最好了，要不然每个情况特殊处理太复杂。不幸的是，其他很多材质都不能用统一模型描述。

对这种情况，人们定义不同的公式描述Diffuse和Specular两项。

- 为了描述Specular,  人们为了描述表面粗糙度，设计了微表面模型Microfacet来定义法线和高光的分布，这也就有了GGX, Cook-Torrance之类。后来还有multiscatter的考虑等等。
- 为了描述Diffuse, 设计导出了Lambert, Oren-Nayer之类模型。以及最近热门的multiscatter的考虑。

![4689d0cf19d789b6f4bcf47b2c6fea0c.png](/images/4689d0cf19d789b6f4bcf47b2c6fea0c.png)

![51f25c3814088d4e1878cb372d89c2c8.png](/images/51f25c3814088d4e1878cb372d89c2c8.png)

对于其它的物体，没有统一模型，有很多特殊情况。就又衍生出了不同的模型来描述，比如：

- 半透明物体，会有SS项，人们就发明了预积分和屏幕空间模糊等等技巧模拟。
- 布料，由于表面会有毛绒，导致一般的S和D项模型不能描述，人们发明了比如Ashikhmin等模型。
- 毛发，由于是一根一根的，一般模型不能描述，人们发明了Marschner等模型
- 车漆，有两层Specular，人们发明了一些多层高光的模型。
- 毛玻璃，主要是TS，比如一般就用模糊背景的方式模拟。

![5945b921be31722a1dc5a9cad1151403.png](/images/5945b921be31722a1dc5a9cad1151403.png)

材质（BRDF）这方面一直在演进。虽然最早2012年Disney BRDF引发的风潮开始已经8年过去了。

直到最近（2019）仍然有很多细节的问题，比如不同BRDF的Multiscatter怎么做？

这也是PBR中大家最关注的一方面，与美术制作关系最大。因此很多地方是从BRDF开始讲的。

1. 光源与光路

我们分析一下物体表面受光的情况，表示出所有光路的可能性，做一个分解。

![path_large.png](/images/path_large.png)

简化起见，我们暂且把太阳和云定义为光源。（后面我们可以拓展到云是受光物，只有太阳作为光源），记为L。

物体表面的作用中，Diffuse记为D，Specular记为S，Transmission记为T。最后，眼睛记为E。

我们可以对这些光路与物体表面作用的次数进行归类：

- 1次： LDE, LSE，这一类只有一次反射就到达了眼睛
- 2次+：LDDE, LSDE, LTTDE，这类经过了两次多次达到了眼睛。

还有一个特殊的：

无法一次到达眼睛的光路，比如LD2D3E，是这个光源的阴影

这些光路可以无限递归下去，但是，我们做实时图形学不能考虑所有情况，只能做简化。

同时我们注意到，同一个点会受到很多物体的影响。比如B点，会受到光源C和F影响，附近物体光照D。我们也需要做简化。

这里就有了几个简化：

- **直接光照 vs 间接光照**，我们考虑光路与物体表面作用的次数。一次是直接光照，比如上图LDE。两次以上是间接光照。一次的是好计算的，多次的一般没有实时算力，要做预处理。
- **阴影 vs 非阴影**，我们考虑他们第一次到达受光物体后，能不能到达光源。不能的就是阴影，比如上图LD2D3E。
- **精确光源 vs 环境光源**，有具体形状的光源是精确光源，比如上图L1，比如点光源，spot light；环境光是环境光源，不仅仅是一点入射，而可能是各个方向都有，比如上图L2。
- **静止光源 vs 运动光源**， 这基本是为了性能做的划分。静止的永远是好办的，我们可以预处理它们，但是对于运动的光源就要想办法模拟了。

同时又加上BRDF的分类，比如不同的光照对于Diffuse和Specular的简化方法是不一样的。

这样每种光源类型对应每种BRDF可能产生指数级爆炸的特殊处理技巧。

距离来说，对上面说的这些光源分类，人们发明了很多方法解决它们。

考虑精确光源vs环境光源：

- 怎样采样复杂的精确光源比如矩形光源，球状光源，圆形光源？带出了LTC等。
- 怎样采样环境光？带来了球谐SH, 基于图片的照明IBL，屏幕空间反射等等技巧。

但是，上面这些方法并不能处理所有所有类型的BRDF。这就有了各种问题，比如

- 面光源（LTC）对于不同的BRDF怎么解决，如何预处理？
- IBL对于不同的BRDF怎么解决，如何预处理？

考虑静止光源和运动光源。静止光源我们一般可以预处理。

- 运动光源一般要用上面提到的精确光源和环境光源各种技巧了
- 静止光源，无论几次光路，对于Diffuse部分都可以烘焙基于辐射度的lightmap。这无论精确还是环境光。
- 静止光源，一个更简单的方法，对于Diffuse部分可以做球谐SH。对于动态光源，我们可以做PRT预计算一些不同光照的结果。
- 静止光源的Specular部分有反射球等预处理方法
- 更为统一和更大开销的基于体素的GI方法
- 硬件性能不支持很多运动精确光源怎么办？就有了各种Tile-based， Cluster-based

对阴影，要考虑

- 精确光源的阴影怎么做？怎么表示半影？PCF之类。对于远距离阴影怎么做？CSM，DistanceField之类。
- 近距离的材质上的阴影怎么做？Contact shadow之
- 环境光源的遮蔽怎么做（环境光遮蔽，AO），这有各种屏幕空间AO和预处理的技术。
- 大面积光源的遮蔽怎么做（直射遮蔽，DO)等问题，也有各种预处理的技术。

最后，怎么协调这些方法？

- 比如对于环境光Specular，可能会有全局的IBL，局部的IBL，屏幕空间反射等很多组成部分。怎样保证三者都使用的情况下，整体还是能量守恒的？

![Image.png](/images/Image.png)

这部分更关系到引擎的实现，这不是美术人员能够控制的。这相比于写一个材质，是一个更大更复杂的工程。

我们对比一下离线的情况：上面这些二分完全不用考虑，直接Path Tracing就完事了。

1. 介质与光路

![path_small.png](/images/path_small.png)

物质只是介质的一种简单抽象：石头，木头，塑料这些物质，我们可以把他抽象为一个表面，因为它只有Diffuse和Specular，

但是，牛奶，水，云，雾这些物质，有的不会有具体形态，有的厚度会影响与光线的作用。因为它们与光照作用有Scatter, Transmission的项。

我们再次回到微观，因为一般这种介质都比较稀疏，我们可以把它们抽象为一些稀疏的粒子。

当光照射到一个粒子上，可能向任何方向发生散射Scatter。类比于表面介质的BRDF，我们定义相函数Phase Function来表示这种散射。

这里人们就发明了各种相函数，Mie, Reyleigh, Henyey-Greenstein描述不同物质。当然这是微观角度。在更宏观一点可以把相函数的统计分布归纳为BRDF。

![836ba6f913c24a01fa58da25b289c294.png](/images/836ba6f913c24a01fa58da25b289c294.png)

由于散射的路径非常多很复杂，而实时又不能做蒙特卡洛积分模拟，就有了各种简化和近似的处理方法：

- 指数雾，高度雾
- RayMarching的方法
- 基于体素的方法

从这个角度再看上面提到的一些特殊材质，比如半透明物体，相比于离线的模拟，实时中SSS的模拟非常简化和Dirty了。

1. 物理量与测量

上面定性分析了PBR中面临的问题，但是定量如何？

图形学的一般方法是，一方面进行真实数据的测量，另一方面进行理论建模，让理论建模达到测量结果。

我们不能随便给灯光和物质参数，而是应该参考现实世界的测量结果。这也是PBR的一个核心思想。

对于光源和受光情况分析，人们定义了一些物理单位，引申出一堆光度学的定义，radiance, irradiance, lumimance等等。一方面为了匹配公式的量纲，另一方面是为了个测量提供一个依据。

- 我们可以测量物质表面接受到不同irradiance时反射的radiance是多少，然后用理论建模和公式模拟这个测量结果。这样得出的BRDF就是基于物理的。
- 我们可以测量不同灯光的亮度如何，这样在场景里就可以还原出真实世界的光照，

直观来说，对于材质，肉眼看到的颜色，就是材质本身的颜色吗？我们可以测量出物理量的。比如，

- 金子的Specular颜色，
- 石头的Diffuse颜色

它们应当是什么，都应该有测量依据的，不能随便指认。

![1e9a8e26cebd00e6ee334cbc919b49dc.png](/images/1e9a8e26cebd00e6ee334cbc919b49dc.png)

最后，相机的参数同样需要通过物理定义。我们将光的能量全用物理单位表示了，但是如何感知光线，这个过程是不是物理的？

![03749b8e10b737014982d4c7f66fc201.png](/images/03749b8e10b737014982d4c7f66fc201.png)

比如，什么曝光什么快门可以取得和人眼近似的结果？怎么用EV来表示曝光？

以及，人眼对不同亮度的感知是连续的吗？这就发明了一系列后处理算法，以及这些算法是不是正确的考虑：

- 曝光自适应
- 局部曝光
- tone mapping

1. 总结

笔者这里反思的是，常在引擎中声称使用了PBR流程渲染，其实只用了最基本PBR的BRDF。对于灯光和光照不加考虑，对于材质的参数也不加核对，对于介质比如云雾，用粒子面片叠加的方式来模拟，这真的物理吗？就算我们所有引擎实现是PBR的，但是怎样教导美术生产人员理解并遵守？就算我们实现了PBR，但这和美术方向是一致的吗？如果不一致是因为我们实现错了还是要否定PBR呢？

笔者虽然接触PBR多年了但有时想给人讲清楚仍然有时候自己感到困惑，重新梳理一遍PBR的脉络，自己画了点插图，作为总结，也希望对读者有帮助。

笔者这里梳理的也并不尽完善，尤其没有给很多更详细的参考。

一些很好的参考：

An In-Depth look at Real-Time Rendering

[https://learn.unrealengine.com/course/2436622](https://learn.unrealengine.com/course/2436622)

Moving Frosbite to PBR， 2014年的文章了。PBR在游戏中应用的起步阶段一个很好的综述。

[https://seblagarde.wordpress.com/2015/07/14/siggraph-2014-moving-frostbite-to-physically-based-rendering/](https://seblagarde.wordpress.com/2015/07/14/siggraph-2014-moving-frostbite-to-physically-based-rendering/)

比较新和完整的PBR实时实现，来自Google Filament， 2018年

[https://google.github.io/filament/Filament.html](https://google.github.io/filament/Filament.html)

Advanced in Rendering, Graphics Research and Video Game Production， 2019 i3D的keynote，主要是当前渲染和PBR的一些挑战

[http://i3dsymposium.github.io/2019/keynotes/I3D2019_keynote_StephenMcAuley.pdf](http://i3dsymposium.github.io/2019/keynotes/I3D2019_keynote_StephenMcAuley.pdf)

这里总结了到2019年为止主要的PBR参考。

[http://lousodrome.net/blog/light/2020/01/04/physically-based-rendering-references-at-the-end-of-2019/](http://lousodrome.net/blog/light/2020/01/04/physically-based-rendering-references-at-the-end-of-2019/)
