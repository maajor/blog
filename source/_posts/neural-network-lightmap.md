---
title: Neural Network Lightmap | 神经网络光照贴图
date: 2023-02-26 00:00:00
---

[在线访问](http://nnlm.ma-yidong.com/)
![Untitled](/images/Untitled_2.jpg)

# 问题与猜想

众所周知，Lightmap是一种古老的预计算光照模拟GI方法，可以将间接漫反射信息烘焙到场景物体的UV上，在运行时通过一次UV采样即可获取漫反射GI信息。这种技术在本世代低端设备如移动设备、Web端以及PS3/4时代均有着广泛的应用。当然，本世代最新的GI技术如Lumen等对于动态光照有着更强的处理能力，但对于纯静态的光照，lightmap技术仍然是一种很好的方法。

假设场景是完全静态的，只有视角变化。在这种前提下，lightmap仍然存在一些不足，主要是对于复杂光路的不支持。比如Specular，仍然需要实时计算Punctual Light/EnvMap的BRDF来获取。至于更复杂的光路，如Subsurface Scattering，仍需要BSDF参与，以及需要别的方式存储Irradiance信息。

最近（截至2023年），出现了一些神经渲染技术，以NeRF为代表。尽管其主要解决的是CV重建问题，但其中的很多思路在图形学中仍然可以提供启发。我们可以将NeRF简化为一个

$$
F:(position, viewDirection) \rightarrow (R,G,B, \sigma); 
$$

位置+视线到颜色的映射。区别于lightmap，它预计算的是一个多层MLP神经网络。

而Lightmap通过UV读取获得颜色

$$
Lightmap: (uv) \rightarrow (R,G,B)
$$

这段文字包含两个预计算步骤：一是 lightmap 贴图，二是 R^3→R^2 的 UV Unwrap 信息。前者是通过渲染器的烘焙操作获得，后者则需要在 DCC 软件中手动或自动展开 UV。

因此，是否有可能对神经网络进行预计算，以便在运行时对这些数据进行处理？

$$
F: (uv, viewDirection)\rightarrow(R,G,B)
$$

直接计算出颜色，同时encode传统lightmap不能表示的复杂光路信息？

这个问题笔者考虑了很久，直到最近看到一些文章的启发才成功把他实现。

最后做了一个演示网站：[Neural Network Lightmap (ma-yidong.com)](http://nnlm.ma-yidong.com/)，该网站将一个特殊的Blender材质烘焙成神经网络光照贴图。

![Untitled](/images/Untitled_2.jpg)

旋转相机即可发现它的特殊之处：不仅保存了diffuse信息，还能看到specular和sss的效果。

这些效果总共使用了2张4k的贴图和一个32x3层的神经网络。总共10MB的资产量，运行时间在笔记本上可以到有60fps。

# 启发

## NeRF：神经辐射场

本文是开创性的，这里不再赘述。除了前面提到的方法外，还提出了一种优化技术，类似Transformer的做法，对输入位置参数进行编码。

$$
\gamma(p)=(sin(2^0p), cos(2^0p), ...,sin(2^Lp), cos(2^Lp))
$$

通过一系列级数的sin/cos编码，将输入的位置信息映射到高频，增加神经网络表示高频信息的能力。

## SIREN - **[用周期激活函数的隐式神经表示](https://arxiv.org/abs/2006.09661)**

这篇2020年6月的文章说，使用sin激活函数对图像类信号具有很好的拟合效果。数学公式表示很简单，一个神经元加上一个siren激活函数如下，其中w0是一个常数。

$$
y=sin(w_0(wx+b))
$$

这篇文章的思路来源于傅里叶变换，可以直观地想象一层神经网络是一级的傅里叶展开。

## Shadertoys/Neural stanford bunny

在2021年1月，Blackle将SIREN搬到了Shadertoy上，并构造了一个用SIREN表示的SDF神经网络渲染兔子，第一次向大家展示了神经网络编写Shader代码的可能性。

[Neural Stanford Bunny (5 kb) (shadertoy.com)](https://www.shadertoy.com/view/wtVyWK)

![Untitled_3.jpg](/images/Untitled_3.jpg)

## [Nobigi](https://jure.github.io/nobigi/)，使用神经网络压缩GI

![Untitled_4.jpg](/images/Untitled_4.jpg)

[用神经网络压缩全局光照(juretriglav.si)](https://juretriglav.si/compressing-global-illumination-with-neural-networks/)

此后，2022年9月份，Jure Triglav根据SIREN和Blackle的方法实践了神经网络压缩GI的方法。除了文章外，他还放出了Shadertoy代码，一个codesandbox demo [Loading... - CodeSandbox](https://codesandbox.io/s/nobigi-coffee-cup-example-xtj3tk)

然而，这篇文章提出的方法并不能很好地表示高频信息，因此作者放出的demo也主要是纯色场景。

## [InstantNGP](https://nvlabs.github.io/instant-ngp/)

这篇2022年1月的文章是另一篇开创性的NeRF文章，7月发布在SIGGRAPH上。

在NeRF的基础上，解决了训练加速的问题。笔者认为其主要贡献在于位置的多哈希编码技巧和方向的球面谐波编码技巧。后者也被笔者用于项目中。

## [Mobile Nerf](https://mobile-nerf.github.io/)

这篇2022年8月的文章主要贡献是将nerf表示为mesh，并运行在移动设备上。

思路是预先计算一些特征信息，并展开在UV贴图上，然后通过视线信息实时还原出渲染结果。

![Untitled_5.jpg](/images/Untitled_5.jpg)

这种方法已经非常接近笔者使用的方法，只不过解决的问题有些不同。本文作者并没有场景的mesh信息，而需要通过多张照片还原出来mesh。

作者最后只编码了两张图片（8个通道），给了笔者启发。

## Siren GI

ycz在知乎上分享的文章获得了HPG学生竞赛的第一名。笔者也受到这篇文章的启发。

[Siren GI：用神经光照夺得图形学顶会竞赛的第一吧 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/604830872)

和前面几篇文章有一些相似的地方，例如使用SIREN作为神经网络的激活层，和Nobigi如出一辙。使用两段网络，后一段输入v并进行实时推理，与Mobilenerf基本一致。只是Mobilenerf没有使用lightmap的概念，而只是称之为特征。

其网络结构如下图所示：

![Untitled](/images/Untitled_6.jpg)

# 实现细节

## 数据合成

场景就是blender制作的，模型的UV我们手动展开就行。至于训练集我们用blender渲染就好，比如这样：

![Untitled](/images/Untitled_7.jpg)

就是在blender里架了很多相机

![Untitled](/images/Untitled_8.jpg)

## Encoding

原始的NeRF文章和InstantNGP都强调了输入编码的重要性。笔者的实验发现，采用这种方法确实可以取得较好的效果。最后，对于位置信息，采用sin/cos级数编码；而对于视角和法线方向的输入，则采用4阶球谐编码，类似于InstantNGP。

## WebGL Shader

参考Nobigi的方法，将keras神经网络转换成webgl代码的步骤如下。同时，笔者也将pytorch转换成webgl代码。

该方法的思路是将大矩阵的运算转换为小的4x4矩阵，并利用shader的vec/mat乘法。因此，最终生成的代码可能会包含一些奇怪的代码。
以下是参考链接：

[nobigi_two_axis_example.ipynb - Colaboratory (google.com)](https://colab.research.google.com/github/jure/nobigi/blob/main/notebooks/nobigi_two_axis_example.ipynb)

```clojure
vec4 f12=sin(mat4(-.182,-.432,.23,.425,-.272,-.268,-.154,.025,-.417,.03,-.258,-.293,.07,-.328,-.308,.036)*f00+mat4(.461,-.16,-.073,-.085,.448,.215,-.005,-.014,.577,.136,-.559,.195,.438,-.406,-.456,-.58)*f01+mat4(.202,-.339,.085,.479,.7,.036,.148,.042,-.122,.019,-.66,-.365,.57,-.088,-.355,.41)*f02+mat4(-.435,.277,.072,-.158,-.421,-.038,.07,.218,.003,.003,.398,-.294,.229,.418,-.198,.009)*f03+mat4(.339,-.197,-.215,-.333,.018,.089,-.119,.277,-.173,.15,.029,-.132,.122,.367,-.311,.072)*f04+mat4(.011,.068,.396,-.052,.326,-.003,.205,.222,.311,-.116,-.361,.374,-.099,-.2,.137,.107)*f05+vec4(-.239,.128,.161,-.115));
```

最后做网站用r3f/drei的脚手架就不再赘述。

## 训练

![Untitled](/images/Untitled_9.jpg)

2K epoch最后MSE per pixel loss大概54，换算PSNR 30db左右，属于凑活能看了。

## Lightmap结果

UV就是在blender里展开的，

![Untitled](/images/Untitled_10.jpg)

最后lightmap：

![Untitled](/images/Untitled_11.jpg)

# 总结

笔者还没有测试更多的场景和效果，但看上去，这种使用神经网络光照贴图的方法似乎是成立的。