---
title: Game Art Trick – Light Field and Imposter | 游戏美术技巧 – 光场与公告板
date: 2020-12-27 00:00:00
---

![gif_animation_008.gif](/images/gif_animation_008.gif)

鸽了两个月回归。笔者了解基于图像的方法时，初听感觉没有什么特别，但细细想来忽然感觉其实以前遇到的不少美术技巧都是和这个原理相关的。当时不知道这些技巧如何被人想到，如今才发现与图形学有其相通之处。因此这里整理成文。毕竟理论水平还要学习一个，大概只能给读者一个定性的认识了。

图形学中有两类文化-基于物理的(Physical Based) vs 基于图像的(Image-based)。前者是一种原子论的方法，演绎的方法，比如PBR，希望通过对现实世界的物理建模，还原现实。后者是一种整体论的方法，归纳的方法，对现实世界做整体性和经验性地描述而不那么关心物理变量，比如光场方法。

游戏中，我们使用前者的时间比较多，光照模型PBR等等，本身就是希望接近物理现实的。后者也不完全是没有，比如用材质扫描方式生成贴图。

光场是一类表示方法，是上文提到的后者-基于图像方法-中的一种典型方法。英文为Light Field或者Lumigraph，Yan Lingqi教授在GAMES101的第19讲中介绍过这个概念，

其思路也是：我们不需要关心视觉效果表现的原理，不需要BRDF和材质，我们记录下来每个视角上物体的表现就行。

光场将物体表示为一个全光函数，这是一个7维的函数，包含空间位置（x, y, z）、光线方向（Θ, Φ）、波长（λ）和时间（t）

![3b00d4be9f0cefb120a52b4eeadc0031.png](/images/3b00d4be9f0cefb120a52b4eeadc0031.jpg)

当然在游戏中，七个维度的表述，数据量太大了，以下案例中大多做了简化。

- 序列帧，特效中一种常见方法，固定了空间，光线，波长，只有时间的变化。
- 6D Lightmap，或叫6-way lightmap，中文翻译不多见，笔者译为六向光照图吧。这是一种表现烟的常见方法，固定了空间（固定形状，billboard朝向相机），波长（只有一个灰度，用渐变色来染色），时间（也可以用序列帧了），只有光线方向的变化，用任意方向去插值6个方向。
- Octahedron imposter，中文翻译也不多见，笔者暂且译为八面体公告板吧。一种特殊的公告板方法。固定了时间，空间用不同视角表达，光线用法线贴图重新计算，波长用颜色贴图记录。

这些例子中，虽然渲染管线还是当世代的光栅化方法，但用于一些不好表现的物体，采用的是光场方法。

序列帧的例子太简单了，笔者这里就不再赘述。不过Motion Vector Flipbook倒是个蛮有意思的方法，读者有兴趣请自行研究。[http://www.klemenlozar.com/frame-blending-with-motion-vectors/](http://www.klemenlozar.com/frame-blending-with-motion-vectors/)

**1 从六向光照图讲起**

笔者第一次见是在realtimevfx论坛上，skullnbone的特效TD讲了这样一种做烟的特效的方法。

6D Lightmap

[https://realtimevfx.com/t/smoke-lighting-and-texture-re-usability-in-skull-bones](https://realtimevfx.com/t/smoke-lighting-and-texture-re-usability-in-skull-bones)

[https://viktorpramberg.com/smoke-lighting](https://viktorpramberg.com/smoke-lighting)

其基本思路是：为了给一团烟真实的光照，我们预先打几个方向光：前后左右上下 6个方向，故为6D/6-way。

之后对于任意方向的光照，我们用光照方向来插值之前我们6个方向的光照效果。

![d2deae006924e33dbadc399a7e2ae868.png](/images/d2deae006924e33dbadc399a7e2ae868.jpg)

![37182d4222da914c19026a1119577c5f.png](/images/37182d4222da914c19026a1119577c5f.jpg)

本质还一个序列帧公告板了，只不过这样做的主要好处就是，烟的特效受光照了！而且很cheap。

![bcb4275542682eb68505d1d383350c94.png](/images/bcb4275542682eb68505d1d383350c94.jpg)

相比于一般不透明物体，通过法线就能算diffuse，烟和云由于复杂的散射和投射，用基于物理并没有太好的方法，只能对光做步进积分raymarching

当然，让烟/云受光照有很多种方法了，比如切片3d texture raymarching，比如屏幕空间体素raymarching等等，相比而言后面提到的这些更像基于物理的方法，相比于一般不透明物体通过法线就能算diffuse，烟和云由于复杂的散射和投射，用基于物理并没有太好的方法，只能对光做步进积分raymarching。而六向光照贴图就是一种基于图像的方法了，相当hacky和cheap，却相当好用。

这其实再回顾一下崩坏3云的做法，比六向光照图好像更加hacky，pipeline也没讲，每张mask不知道是不是美术自己画出来的。

![e38e103af9a28d4026998eeca804df42.png](/images/e38e103af9a28d4026998eeca804df42.jpg)

接下来笔者联想起一个GI的Case，如何存储GI中Diffuse Irradiance的信息？

当代的游戏引擎Unity UE4大概都会存球谐光照信息，但是早期一点的例子里，就是存一个6向的光照，称为Ambient Cube，见于2006年Valve Source Engine的分享

[https://steamcdn-a.akamaihd.net/apps/valve/2006/SIGGRAPH06_Course_ShadingInValvesSourceEngine.pdf](https://steamcdn-a.akamaihd.net/apps/valve/2006/SIGGRAPH06_Course_ShadingInValvesSourceEngine.pdf)

![41cd8c068a1da0217b35a60885552bb8.png](/images/41cd8c068a1da0217b35a60885552bb8.jpg)

后来人们改进了使用各种球基函数(spherical radial basis function)来存储这些Irradiance信息.

比如球谐Spherical Harmonic，球基高斯Spherical Gaussian

其存储量不大，对于二阶球谐，RGB三个颜色只需要（2+1）*（2+1）* 3 = 27个float。

比如下面这个图可视化了每阶球谐每个band长什么样子。

![8039aaeae010f7ccf30ed3c617644b6b.png](/images/8039aaeae010f7ccf30ed3c617644b6b.jpg)

这里不再具体描述。

**2 球谐光照公告板**

上文讲到从Ambient Cube到SH的例子，其原因当然是球谐能保存信息的信噪比更低，很自然的一个提示是，六向光照图能不能改造成球谐光照公告板？

我们做个案例研究吧，具体步骤如下

1. 构造一个云，渲染出各各方向光照的图
2. 将光照压缩成球谐参数，存成贴图
3. 在引擎中还原球谐效果

2.1 构造云

没太多复杂的，在ZB里随便拉个体块，然后放进Houdini变成云，多光线角度渲染一下就行了

![cloud_source.png](/images/cloud_source.jpg)

笔者这里渲染了540张512x512的不同光照角度的图。

2.2 压缩球谐

有关球谐的基础知识这里暂且略过，笔者也没推导出来，仅仅直观理解就好了，核心会有一个shEvaluate函数

可以理解为对某个角度(phi, theta)的球谐求解。输入参数lmax是最大阶数，比如0阶返回1个float，0-1阶总共4个，0-2阶是9个，0-3阶是16个等等。

```
def shEvaluate(theta, phi, lmax):
    for l in range(0,lmax+1):
        for m in range(-l,l+1):
            index = shIndex(l, m)
            coeffs[index] = SH(l, m, theta, phi)
    return coeffs
```

编码的时候

```
coeffs_total = 0
遍历每个角度：
    color : 当前角度的颜色，一个float
    weight：当前角度的权重，立体角，一个float
    coeffs = shEvaluate(theta, phi, lmax)
    coeffs_total += coeffs * color * weight
```

最后就拿到了整体的球谐系数coeffs_total，同样0阶1个float，0-1阶总共4个，0-2阶是9个，0-3阶是16个等等。

笔者这里每一个公告板的每一个像素都有一套球谐系数，存了2阶，所以总共是512x512x9个系数。

解码的时候更方便，比如给定phi和theta

```
coeffs_dir = shEvaluate(theta, phi, lmax)
color = dot(coeffs_dir, coeffs_total)
```

至于学习案例，对于熟悉Houdini的读者，首推mattebb老哥，在Houdini里实现了一个SH，[http://mattebb.com/weblog/spherical-harmonics-in-vops/](http://mattebb.com/weblog/spherical-harmonics-in-vops/)

非常方便可视化。具体来说，他实现了两个例子。一个是用SH编码遮挡信息，二是用SH实现了一个Irradiance Volume全局照明，有点屌。

至于结果，用二阶球谐构造完，和训练集的一个对比：

![compares.png](/images/compares.jpg)

于是也可以把每个band的参数可视化一下

注意，笔者这里做了归一化，实际上二阶的系数放大了很多倍。看清明暗。可以看到一阶就像六向光照图嘛。

![sh_levels.png](/images/sh_levels.jpg)

对于每一个像素，可以把训练集每个点和球谐拟合曲面一起画出来，

还好，训练集的点整体频率不算高，所以低阶球谐就能拟合出来。

![sh_plot.png](/images/sh_plot.jpg)

最后，对比一下不同阶球谐的重建误差。单位是平均每像素颜色差，范围0-255。二阶球谐的误差大概在平均6个颜色值。

![loss.png](/images/loss.jpg)

3 引擎重建

上文讲到笔者重建了2阶球谐存了512x512x9个系数。这样正好存成三张贴图，当然要之前做一次归一化。

![sh_texture.png](/images/sh_texture.jpg)

我们可以用它和六向光照图做一个对比：

![sh_vs_6way.gif](/images/sh_vs_6way.gif)

左为二阶球谐光照的，右为六向光照图重建的，可以明显看出左侧的细节更多，立体感更强。

实际上放入引擎的时候，笔者感觉云太静态了，所以还是顺便弄一个flowmap吧。具体就是houdini里给云随便做一个curl noise烘成颜色。

![f8a4c6ac455516403f1c0de988a7364c.png](/images/f8a4c6ac455516403f1c0de988a7364c.jpg)

以及用一个ramp来做颜色。

随便刷点草，做一个场景，动态光照的棉花云。

![gif_animation_008.gif](/images/gif_animation_008.gif)

后记，球谐信息除了存储到贴图里面以外，也可以存到模型顶点上噢！不过这是存储的应该是体积遮挡信息，这样方便省略顶点光照上的沿光线方向积分。笔者意识到之前盗贼之海Sea Of Thieve的云，其实顶点存的是一阶球基高斯。

类似的有位大佬把球谐存到顶点上了，他称之为SSSSH，球谐次表面散射。当然还有皮肤用球基高斯次表面散射的做法。

[https://geofflester.wordpress.com/2017/03/17/subsurface-scattering-spherical-harmonics-pt-1/](https://geofflester.wordpress.com/2017/03/17/subsurface-scattering-spherical-harmonics-pt-1/)

噫，之前见过的很多技巧就这么串起来了。

[https://geofflester.wordpress.com/2017/03/17/subsurface-scattering-spherical-harmonics-pt-1/](https://geofflester.wordpress.com/2017/03/17/subsurface-scattering-spherical-harmonics-pt-1/)

[https://mynameismjp.wordpress.com/2016/10/09/sg-series-part-6-step-into-the-baking-lab/](https://mynameismjp.wordpress.com/2016/10/09/sg-series-part-6-step-into-the-baking-lab/)

3 八面体公告板

[https://www.shaderbits.com/blog/octahedral-impostors](https://www.shaderbits.com/blog/octahedral-impostors)

[http://amplify.pt/unity/amplify-impostors/](http://amplify.pt/unity/amplify-impostors/)

这是一种从多角度记录物体材质信息并用于远景公告板的方法，这样从不同角度读取不同帧，就能还原这个角度看到的物体。

![e644992cb2c42973b4f860765bedfa3f.png](/images/e644992cb2c42973b4f860765bedfa3f.jpg)

比如Fornite这个树存了6x6个角度。

笔者最早见到这个做法是在Epic首席TA Ryan的博客里

[https://www.shaderbits.com/blog/octahedral-impostors](https://www.shaderbits.com/blog/octahedral-impostors)

后来unity里也出现一个插件Amplify Imposter

[http://amplify.pt/unity/amplify-impostors/](http://amplify.pt/unity/amplify-impostors/)

后来Houdini也出了工具

[https://www.sidefx.com/tutorials/game-tools-imposter-textures/](https://www.sidefx.com/tutorials/game-tools-imposter-textures/)

![071af6c2993fdb05b049041d51a77c2a.png](/images/071af6c2993fdb05b049041d51a77c2a.jpg)

重新回顾这个方法，感觉和光场方法的思路非常之像，只记录不同视角的效。

果然翻看博客最后的引用里，是参考过与光场有关的论文。

当然笔者就不再赘述其原理，试验感觉是，houdini官方的ue工程好像有点问题，只能用hemi-octahedron imposter和full3d imposter，不能用octahedron imposter，而且imposter不同帧的混合也只有两帧，而不是三帧。相比之下Amplifier Imposter的功能更全一些，imposter的混合也是在相邻三帧的。不过仍感觉转动视角是poping和模糊比较突兀。

此外，笔者还试了下结合八面体公告板和六向光照图，至于效果嘛，并没法看。同样大小贴图可能还不如体素贴图。

4 3D公告板压缩

笔者对这个方法的主要诟病是，需要的内存太大了，一个最远LOD的公告板贴图用2K，有点夸张。

一个直接的想法是，这东西能不能**压缩**？其实每帧之间，相似的像素还挺多的？

至于压缩的方法，遇事不决神经网络咯。

有一个相当接近的论文叫NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis

输入一系列图片，神经网络能学习出来不同视角时看的效果。

![68747470733a2f2f70656f706c652e656563732e6265726b656c65792e6564752f7e626d696c642f6e6572662f6665726e5f3230306b5f323536772e676966.gif](/images/68747470733a2f2f70656f706c652e656563732e6265726b656c65792e6564752f7e626d696c642f6e6572662f6665726e5f3230306b5f323536772e676966.gif)

思路大概如下

![](https://github.com/bmild/nerf/raw/master/imgs/pipeline.jpg)

神经网络输入一个视线方向和空间中一点，能预测出颜色和密度。这样对于整幅图片，每个像素我们raymarching跑一下这个神经网络，就能得到最终颜色。

虽然模型很小，大概5MB，但是预测时的计算量还蛮大的，相当于每像素每步长都要跑一下这个网络。

不过我们试试呗，对于一个3D公告板贴图看能不能用神经网络压缩一下。

笔者就用了猪头模型，用SideFX Labs的imposter texture渲一个公告板

![dbba7eb7ba5e5a06f26fc4e9f12f0a1b.png](/images/dbba7eb7ba5e5a06f26fc4e9f12f0a1b.jpg)

得到一个16x16的法线图

![2484a9ad6639801d670a36202520c758.png](/images/2484a9ad6639801d670a36202520c758.jpg)

这样训练集256张128x128的图。

当然首先一个想法，球谐能存储这个公告板吗？直观的感觉是不行，每个像素变化的频率太高了。

实验结果是：确实不行。

重影很厉害。

![compare_3dimposter_sh.png](/images/compare_3dimposter_sh.jpg)

提高阶数，好像越高阶越好，而且就算10阶每像素还是接近20的误差，这就没啥意义了。

![loss_3dimposter_sh.png](/images/loss_3dimposter_sh.jpg)

用神经网络的方法，我们参考NeRF的方法，也是直接使用全连接网络。

笔者给的D=6，W=256，所以两层输入输出各是4x256，中间6层256x256的全连接层。

```
self.fc_in = nn.Linear(4, W)
self.fcs = nn.ModuleList([nn.Linear(W, W) for i in range(D)])
self.fc_out = nn.Linear(W, 4)
```

输入之所以是4，因为除了角度phi，theta以外，还有uv坐标。思路类似NeRF，每个像素都要跑一遍这个神经网络。

训练大概800个Epoch以后，平均每像素误差大概降到不到7。还凑活。笔者也对比了3层128，3层256，8层256；似乎还是6层256不错。

最后一个对比：左面是训练集，每帧之间poping还不小，而右边是神经网咯预测的，可以看到大体结构差不多，但是细节还欠缺一些。

![compare_nn_imposter.gif](/images/compare_nn_imposter.gif)

不过一个好消息是，模型还挺小的，大概1.5MB，因为是有256*256*6个float个参数。相当于一张1K贴图，比原来2k贴图压缩了4倍。

后面笔者就没有继续整合进引擎试验了。理论上用笔者之前实现的Neural Network Post Processing是可以放进引擎。但这个方法需要每像素计算6次256*256的矩阵运算，相比于传统光栅化的shader复杂程度高了不少数量级的，但是效果又不一定好。

虽然这个实验不太成功，但是至少是不是可以启发将来有可能神经网络可以整合进渲染管线？比如一个不好渲染的物体，用神经网络光场方法拟合，然后和传统光栅化/光线追踪管线一起使用？

总结

笔者介绍并延伸了两种经典的公告板方法：六向光照图和八面体公告板，指出了其与光场方法思想的联系。对于前者，改进了一种更好的方法。对于后者，指出了其将来可能的应用场景。给读者一个不同于基于物理方法的思路，希望对读者有帮助，并提前祝新年快乐！

参考

[https://www.youtube.com/watch?v=Rd0nBO6--bM&feature=youtu.be&t=1992&ab_channel=IntelISL](https://www.youtube.com/watch?v=Rd0nBO6--bM&feature=youtu.be&t=1992&ab_channel=IntelISL)

[http://www.klemenlozar.com/frame-blending-with-motion-vectors/](http://www.klemenlozar.com/frame-blending-with-motion-vectors/)

[https://realtimevfx.com/t/smoke-lighting-and-texture-re-usability-in-skull-bones](https://realtimevfx.com/t/smoke-lighting-and-texture-re-usability-in-skull-bones)

[https://viktorpramberg.com/smoke-lighting](https://viktorpramberg.com/smoke-lighting)

[https://steamcdn-a.akamaihd.net/apps/valve/2006/SIGGRAPH06_Course_ShadingInValvesSourceEngine.pdf](https://steamcdn-a.akamaihd.net/apps/valve/2006/SIGGRAPH06_Course_ShadingInValvesSourceEngine.pdf)

[http://mattebb.com/weblog/spherical-harmonics-in-vops/](http://mattebb.com/weblog/spherical-harmonics-in-vops/)

[https://geofflester.wordpress.com/2017/03/17/subsurface-scattering-spherical-harmonics-pt-1/](https://geofflester.wordpress.com/2017/03/17/subsurface-scattering-spherical-harmonics-pt-1/)

[https://mynameismjp.wordpress.com/2016/10/09/sg-series-part-6-step-into-the-baking-lab/](https://mynameismjp.wordpress.com/2016/10/09/sg-series-part-6-step-into-the-baking-lab/)

[https://www.shaderbits.com/blog/octahedral-impostors](https://www.shaderbits.com/blog/octahedral-impostors)

后来unity里也出现一个插件Amplify Imposter

[http://amplify.pt/unity/amplify-impostors/](http://amplify.pt/unity/amplify-impostors/)

后来Houdini也出了工具

[https://www.sidefx.com/tutorials/game-tools-imposter-textures/](https://www.sidefx.com/tutorials/game-tools-imposter-textures/)

NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis

[https://github.com/bmild/nerf](https://github.com/bmild/nerf)
