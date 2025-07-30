---
title: BxDF Truth to Realtime with Mitsuba. A case study of Fur BSSRDF | BxDF从真实到实时，以毛发为例
date: 2020-05-09 00:00:00
tags:
  - Graphics
  - Rendering
  - Technical
  - Game Development
  - Research
---

![image_0003.jpg](/images/image_0003.jpg)

在写GAMES101大作业时,在Mitsuba里实现BxDF, 遇到的很大一个问题是, 怎么知道渲染结果是'物理正确'的? 

我们凭什么相信渲染器或者游戏引擎的渲染结果，是“物理正确”的？如果不是物理正确的，限于模型和计算性能的限制，什么损失了？

要回答这个问题很不容易，不是所有引擎和渲染器都是开源的，也不会有时间去研究所有渲染的代码。

当然我们知道，PBR不仅仅是材质，还包括**灯光**，**相机**。有关PBR一个集大成的talk是来自Frosbite的Moving Frosbite to PBR. 材质BRDF只是其中很小一部分了。当然本文也只讨论材质（BRDF）了，仅仅以自己尝试实现一个实时的毛发渲染为例子。

笔者这里想实现的是，Yan Lingqi教授的An Efficient and Practical Near and Far Field Fur Reflectance Model. 原论文是离线的实现，而笔者最终想要实现一个实时的版本。仅仅是一个single-scattering。

简单来说，从真实到实时模拟是这么一个过程：

1. 物理测量

2. 理论建模

3. 离线实现

4. 实时简化

其中，第1,2步是论文描述的，第3,4步是笔者实现的。这其中，每一步都可能产生错误。比如，测量数据的系统误差，理论建模省略的部分，离线实现时代码的错误，实时简化时省略的部分。为了减少误差，需要参考。因此，每一步的结果，都是下一步的参考，以减少下一步中损失的误差。

我们姑且相信论文的部分，本文集中讨论另外两步。

首先，简单回顾前两步

# 1. 测量

最好的方法是做实验，测量世界，测量BRDF，用真实数据作为参考。这是大量有关BRDF的论文会采取的方式，这也是MERL BRDF等数据库的目的。比如头发的渲染中，Marschner03论文中，测量了固定入射角度时候，不同出射角度上的分布。

![measure_brdf.png](/images/measure_brdf.jpg)

而在Yan 17'中，用一个球状测试台，记录了不同入射出射角度上的reflectance。

![measure.png](/images/measure.jpg)

# 2. 理论建模

对于毛发的理论建模，当然还是从Marschner 03' 讲起.

%!(EXTRA markdown.ResourceType=, string=, string=)

光线与发丝的作用会有三个path， R反射，TT投射，TRT透反射。 那么我们把每一项都建模出来就行了。

首先我们做一个divide and conqure, 把每一个path的分布分解成两项，

     M项是轴向的，即，沿着发丝圆柱体轴的。

    N项是径向的，也就是在圆柱的圆形截面内部的传播。

![hair-terms.png](/images/hair-terms.jpg)

那么M项，直接就定义成一个高斯分布吧！宽度就是roughness。

-为什么这么定义？因为高斯分布简单啊。而且和测量的lobe还挺像的。确实用高斯分布模拟已经“挺好”了。

当然后话是，之后的论文中，把这个分布定义地更加精确了，比如dEon 11'中，用了一个能量守恒高斯分布来计算这个M项。

N项呢，分成两部分：A和D。

A是Attenuation，即颜色衰减项。包括两部分，一个是经过边界时候，菲涅尔的损失F。另一个是在截面内传播受到介质的吸收T。

D是径向的一个分布函数。当然这是dEon 11‘中的叫法。光路在出射角度附近的分布。在Marschner 03’中，没把径向当成粗糙的，而是通过出射方向能直接解出A项中经过的路径。这也是Marshcner 03和dEon 11的主要区别。

![azimuthd.png](/images/azimuthd.jpg)

这其中核心在于h的计算。

注意一件事情，h和出射角度是相关的。但我们的问题是，在brdf中，是要接受任意wi和wo的。也就是说，brdf计算时候不知道h是多少。另外一个注意的现象是，光线在介质中传播的距离也是跟h相关的，这影响到我们Attenuation项的计算。

![h.png](/images/h.jpg)

Marschner 03'中，是通过求根公式模拟（注意，TRT项求根的话是三次的），根据wi wo解出h，进而计算出A项。

而dEon 11‘中，对这个分布做了预积分，尽管我们不知道入射的h是多少，但我们可以对h积分，反推出出射方向上分布是多少。

也就是这个公式

![np.png](/images/np.jpg)

这里还有一个有意思的是，PBRTv3在实现这个N项的时候，是给到brdf了h参数，因为几何求交的时候计算它了。

所以之后只要sample这个ApDp函数就行。这就很诡异了，结果是，PBRTv3的头发渲染确实非常非常慢，比预积分慢10倍。

综合以上，就得到头发的BxDF了！

下一步，是Fur的模型。我们注意到有一些区别，来自于双圆柱medulla的影响

主要两项

1. Medulla的吸收

回忆Marschner模型中，径向分布Np中，有一个Attenuation项，需要计算光路通过介质的吸收率。在Fur模型中，我们多了一个medulla的吸收项。

2. Medulla的散射

medulla是非常粗糙的，会在内部产生大量散射。这里会导致TT项和TRT项多一个散射项TTs和TRTs. 论文里的做法是模拟了一个圆柱散射的结果，然后存成一张LUT，（4维，300MB），运行时查询。

![doublecylinder.png](/images/doublecylinder.jpg)

至于其他的Mp项，Dp项，我们直接拿dEon 11's的方法就行。

这两个区别中，对于第一个区别，只要计算出截面里这个sm和sc，剩下的就和Marschner没啥不一样了。

第二个区别中，反正是查找表，我们直接拿数据就行。

# 3. Offline

图形学术界一般的做法是，在Mitsuba里实现。简单介绍一下，Mitsuba就是大家一般比较信任的一个离线Path Tracing的渲染器。Mitsuba 0.6是最后一个版本。前两年又出了Mitsuba2做Differentiable Rendering，另一回事就不讲了。我们这里还是用Mitsuba 0.6.

对了讲一下Mitsuba的安装方法吧，首先声明，GUI和Collada我都不能用，所以自己build出来的都是不带这俩的

至于为什么要自己build，因为要改源码。。。否则的话，直接下一个release版就行

首先clone一下，我自己用gitee拉了一个版本，当然你也可以选择自己拉Github的版本或者自己用gitee拉一个

git clone [https://gitee.com/maajor/mitsuba.git](https://gitee.com/maajor/mitsuba.git)

之所以要换到scons-python3这个branch是因为我ubuntu默认是py3编译，要不会有py2语法不兼容

git checkout scons-python3

然后安装一堆依赖包，我直接就没装collada和qt

`apt-get install scons libboost-all-dev libglewmx-dev libpcrecpp0v5 libjpeg62-dev libopenexr-dev libxerces-c-dev libfftw3-dev libfftw3-dev`

这就可以build了

```
cd mitsuba
cp build/config-linux-gcc.py config.py
cons -j8
source setpath.sh
```

配好后，就可以用

mitsuba path-to-your-scene.xml渲染了

好了，装好以后就可以自己复制一个brdfs，实现eval()方法了。

当然，实现Marshner 03'的模型不用从头开始。笔者借鉴了PBRTv3和Tungsten。如前文所说，前者匪夷所思地给brdf提供了h，计算的很慢。而后者基本是一个dEon 11'预积分的做法。

不过Mitsuba和Tungsten不一样的地方是，brdf拿进来的wi和wo不是圆柱坐标系下的。但我们需要的是thetaI, thetaO, phi，需要转成geoFrame里面的。

效果

![hair-mitsuba.png](/images/hair-mitsuba.jpg)

在Marschner Hair的基础上，我们来实现Fur BSSDF

根据上文分析的区别，在吸收项里面，我们算一下sm，带入论文的公式就行
```
auto sinGammaT = math::clamp(points[i]/iorPrime, -1.0f, 1.0f);
gammaTs[i] = std::asin(sinGammaT);
fresnelTerms[i] = dielectricReflectanceLayers(1.0f/m_eta, cosHalfAngle*std::cos(gammaIs[i]), m_l);
auto sm = math::safe_sqrt(m_kappa*m_kappa - sinGammaT*sinGammaT);
auto sc = math::safe_sqrt(1 - sinGammaT*sinGammaT)-sm;
absorptions_c[i] = (-m_sigma_ca*2.0f*sc/cosThetaT).exp();
absorptions_m[i] = (-(m_sigma_ms + m_sigma_ma)*2.0f*sm/cosThetaT).exp();
```
在散射项里，Cn不用多说，直接带入预积分Np项就行。Cm有点特殊

![cm.png](/images/cm.jpg)

数据表里给了thetaO在正（绿）反（蓝）两面的反射值，需要两个都查表找到，然后用phi来插值计算。

最后，在k～=0时的一个结果，可以看到前三项和Marschner Hair基本一致，区别在于roughness定义不一样

![hairvsfur.png](/images/hairvsfur.jpg)

改变Kappa可以看到纯度的变化

![kappa.png](/images/kappa.jpg)

# 4. Realtime

话说回来Mitsuba，在国外的实时渲染界，一般也是会以Mitsuba做为参考的。比如ReadyAtDawn的MJP大佬在一篇博客中，介绍了用Mitsuba作为参考的方法。在Sebastien大佬的Moving Frosbite to PBR中，也提到了使用了Mitsuba作为离线参考，S大佬现在在Unity做HDRP啦.

那么回到实时渲染，我们有两个参考：Karis 16’, 是Unreal4中的实现。Tafuri 19'，是Frosbite中的实现

Tafuri 19‘的主要贡献是，改进了D项的拟合和模拟了multi-scattering

我们这里还是以Karis 16’为主要参考，看看损失了什么。

首先对于Mp项，都是用的Marshner原始版的高斯分布，而没用dEon 11'的能量守恒高斯

其次，对于菲涅尔项，都是用的Schlick拟合版本。

然后对R路径，没有什么区别。

## 4.1 TT

对于TT路径，Ap里损失了一个h的计算。

注意dEon 11'里预积分不用计算h，这个是用了Marschner 03'，近似了h的解析解. 还好，这个还是挺接近的。

我们可以直接用这个h计算Ap项。对于Fur是一样的，只是多加了一个吸收项而已。

![htt.png](/images/htt.jpg)

值得一提的是，Tafuri 19'里甚至没有计算这个h，直接假定h=0，居然自称效果还不错？？？？？

然后Dp里，Karis 16‘ 很诡异地直接给了个

![dtt.png](/images/dtt.jpg)

D是一个logistic分布。

这里问题是，凭什么给0.35的值。后一个pi的常数应该没问题，尖峰是在对面的。

这个0.35应该是取决于两个参数：ThetaD和Roughness，会影响分布的宽度。这里固定也就意味着，这个Dtt分布在不同thetaD和roughness下损失会很大。

Tafuri 19'里对这个改进很多，首先预计算了一个roughness, phi, thetaD的3DLUT，然后假定phi满足高斯分布把LUT变成了2D的。

## 4.2 TRT

这里Np如果预积分的话，会有sigma，roughness，phi，thetaD四个变量，拟合也是很困难的。

Karis 16‘ 直接放了个大招，给定h=sqrt(3)/2。凭什么。。。

不过不管怎么样，有了h我们就可以计算Ap了。

对于D项，Karis 16‘ 和TT一样，直接给了个固定参数的Logistic分布。那么意味着和Dtt一样的问题，对于不同thetaD（不同视角）和不同roughness下，分布会不正确。

Karis 16‘ 的改进是加了一个粗糙度的影响项。仍然没考虑thetaD的影响。

这里笔者也研究了下， plot一个不同thetaD的预积分结果。其实thetaD影响也很大的好吧。

![dtrt.png](/images/dtrt.jpg)

## 4.3 TTs和TRTs

这两个是Fur BSSRDF独有的。

这两项很讨厌的是，它是一个大表。我们计算做LUT维度也不能高。所以只能固定几个维度上的典型参数，去拟合变化最大的参数。

### 4.3.1 Mps

首先拟合这个Cm，还好对于典型的sigma和g，它长得基本一样

![cm-approx.png](/images/cm-approx.jpg)

### 4.3.2 Nps

当然对与Ap项，我们一样可以像TRT项一样猥琐一下，假定h=sqrt(2)/3

对于D项，我们要拟合的是预积分的Cn，而不单单是Cn

这个很讨厌了在两个维度上都有变化，最好还是要预计算一个LUT。

笔者这里就很暴力了，比如对Dtrts，固定了一个sigma和g，强行拟合。

![dtrts.png](/images/dtrts.jpg)
### 4.3.3 简化总结

总结一下，我们在两个部分上做了近似：Ap和Dp。

- 前者Ap里，我们经常固定一个h参数。这会导致最终的颜色吸收率跟真实结果有区别，导致的表现为颜色变了。这在改变kappa时会很明显。

- 后者Dp里，我们经常固定roughness或者thetaD的参数，这会导致不同粗糙度和视角时，高光的分布不正确。其中粗糙度的影响还是比较大的。

我们在Mitsuba里实现这个简化的模型可以看到比较明显的结果。一是，改变kappa时颜色变化不对。二是，改变粗糙度时，TRT高光范围不对了。

![fur-simp.png](/images/fur-simp.jpg)

对比一下不同路径项与离线渲染的区别。 如我们预测的，颜色项有一定区别。TTs和TRTs中由于固定h计算的吸收颜色有些接近，但不正确

TRT和TT中分布也有些误差

![mitsuba-vs-unity.png](/images/mitsuba-vs-unity.jpg)

### 4.3.4 模型

最后一个不可忽略的简化是模型。离线中的发丝模型在实时中不完全可用。尽管有frosebite里strande based的实验，但大部分还是在用插片或者furshell的方式。

众所周知有插片和furshell两种做法，都实现了一下。

![haircards-and-shell.png](/images/haircards-and-shell.jpg)

# 5. 讨论

## 5.1 还差了什么？

差得多了。。。。

### 5.1.1. Dp项的提升，都可以用Tafuri 19'里LUT的方式改进，减少魔数函数的模拟。

### 5.1.2. Multi Scattering

这里我们只做了single-scattering，即直接光照与单根毛发的交互效果。还欠缺，是在发丝内部的散射。当然Path Tracing是不用考虑这个的。不过我们实时这个就很麻烦了。

UE的做法非常hack。。。模拟一个假法线

![uescatter.png](/images/uescatter.jpg)

Frosbite的做法相对精确一些，用Deep Opacity Map

![frosbite-multiscatter.png](/images/frosbite-multiscatter.jpg)

我们这里抄一下UE的做法

不是，这也太假了吧。。。。

![hack-multiscatter.png](/images/hack-multiscatter.jpg)

### 5.1.3. 对灯光的支持

Area Light怎么办？IBL怎么办？不支持啊

在Karis 16’里讲了个hack，用fake normal去采SH，当成直射光

### 5.1.4. 阴影

Shadow map有精度问题。当然也有Screen Space Shadow(contact shadow)可以加上去。

另外还有个很hack的做法就是烘AO了。。。

最后，镇楼一个油光锃亮的狗子吧，Unity中渲染. 模型来自https://c4ddownload.com/dog-3d-model-2/

![image_0003.jpg](/images/image_0003.jpg)

## 5.2 '物理正确'和'美'的关系

关于什么是美的问题，它太宏大了，这里就不尝试分析了。

我的意见是，考虑物理规律会让画面更容易被大众欣赏，但是不是追求物理正确取决于艺术/产品/游戏的意图。

图形学的发展过程，揭示了科学如何接近世界显现的规律。奠基者们定性描述了现象，后人逐渐从更高阶模拟接近现象。比如早期blinn-phong, kajiya-kay的光照模型的提出，渲染方程的提出，是一个定性的过程。到如今Microfacet模型，各种Path Tracing方法的提出，解决了定量的问题。

## 5.3 为什么我们追求“物理正确”

有这么几个考虑

- 美术风格

美术风格如果是写实的话，那我们追求极致物理正确肯定是有意义的。

即使是风格化的美术，那么从写实开始简化和风格化也是很好的途径，迪士尼的动画片都是基于物理的。

- 光照统一性

当需要大量动态光照，室内室外，昼夜变化时。使用基于物理的渲染，可以解耦贴图制作，灯光设置，场景布置。关键在于“解耦”。否则，不同团队之间依赖太多，会导致效果永远达不到预想。

- 资产制作的标准化

当贴图参数设置，灯光照度设置等标准化后，可以大大加快美术制作速度。

## 5.4 本文的意义

具体到本文这个例子中，实现这个Fur BSSRDF有意义吗？

- 没啥意义。对于大部分风格化的项目，Kajiya-kay已经足够好了。对于写实的项目，Marschner Hair也足够好了。Fur BSSRDF中增加了kappa和scatter项。前者感觉改basecolor就能模拟差不多的效果，后者由于数据占用很大，不如直接hack了事。而且没有还没有实现其他光照条件的渲染。

如果BRDF中，说Kajiya-Kay是一阶模拟的话，Marshner Hair是二阶模拟，这个Fur BSSRDF已经是三阶模拟了。我们看看其他技术，头发的物理中，用骨骼是一阶模拟，strande是二阶模拟。头发的几何模型中，插片是一阶模拟，strande是二阶模拟。物理和几何里，我们二阶都还没达到实用。

那么本文有啥意义吗？

可能有一点吧，

- 带读者了解一下Fur  BSSRDF的具体原理

- 带读者了解一下BxDF一般是怎么做到Realtime的

- 带读者了解一下Mitsuba

# Reference

Yan, Ling-Qi, Henrik Wann Jensen, and Ravi Ramamoorthi. "An efficient and practical near and far field fur reflectance model." ACM Transactions on Graphics (TOG) 36.4 (2017): 1-13.

Yan, Ling-Qi, et al. "Physically-accurate fur reflectance: modeling, measurement and rendering." ACM Transactions on Graphics (TOG) 34.6 (2015): 1-13.

Marschner, Stephen R., et al. "Light scattering from human hair fibers." ACM Transactions on Graphics (TOG) 22.3 (2003): 780-791.

d'Eon, Eugene, et al. "An energy‐conserving hair reflectance model." Computer Graphics Forum. Vol. 30. No. 4. Oxford, UK: Blackwell Publishing Ltd, 2011.

Brian Keris, “Physically Based Hair Shading in Unreal.” 2016

Sebastien Tufuri, “Strand-based Hair Rendering in Frostbite”， 2019

Lengyel, Jerome Edward. "Real-time fur." Rendering Techniques 2000. Springer, Vienna, 2000. 243-256.

Jakob, Wenzel. "Mitsuba renderer." (2010): 9. [http://www.mitsuba-renderer.org/index_old.html#](http://www.mitsuba-renderer.org/index_old.html#)

MJP的Mitsuba使用教程

[https://mynameismjp.wordpressM.com/2015/04/04/mitsuba-quick-start-guide/](https://mynameismjp.wordpressm.com/2015/04/04/mitsuba-quick-start-guide/)
