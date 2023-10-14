---
title: Economize Your Texture | 如何节约贴图
date: 2020-08-25 00:00:00
---

我们的硬件资源不是无限的，而其中内存（显存）又是很容易紧缺的一个环节，而其中贴图又占了大头。

如何节约贴图？是我们做资源管理时不可忽视的问题。

本文做一个个人的总结，从业内实践，到硬件处理都会有些涵盖，而这些不同的方法，归根结底其思想也是共通的，甚至与别的领域，如音视频压缩，神经网络压缩有异曲同工之妙。

以下分为几种重要思想描述：

- 重用
- 量化
- 特征降维
- 频域分解

**重用**

**连续贴图**

当然这没什么好说的，一般分成

四方连续-即贴图四个方向都可以连续

二方连续-即贴图在左右或者上下方向可以连续

用连续贴图可以让贴图在一或两个方向上重复，减少总贴图大小。

四方贴图一般就是基础的地面墙面上会用。而二方连续贴图用处用处更广，可以单独做一张Atlas，一般成为Trim Sheet。也可以和非连续的部分放在一张贴图上，作为一张Atlas

![](https://software.intel.com/content/dam/develop/external/us/en/images/modularity-for-games-fig2-trim-sheets-759511.jpg)

例，一个Trim Sheet，图片来自 [https://software.intel.com/content/www/us/en/develop/articles/modular-concepts-for-game-and-virtual-reality-assets.html](https://software.intel.com/content/www/us/en/develop/articles/modular-concepts-for-game-and-virtual-reality-assets.html)

**模块化与UV重用**

这不仅仅可以是物件级别的模块化，更细致的可以是UV和贴图级别的模块化

比如这个例子中，你如何相像它可以怎么节约贴图？每一寸都可以重用。

![53f8b60e80d94914bacbe9c7d160ee73.png](/images/53f8b60e80d94914bacbe9c7d160ee73.png)

图片来源： [https://software.intel.com/content/www/us/en/develop/articles/modular-concepts-for-game-and-virtual-reality-assets.html](https://software.intel.com/content/www/us/en/develop/articles/modular-concepts-for-game-and-virtual-reality-assets.html)

下面这个例子中，每一个地方都在重用贴图，而由于形状的丰富性，甚至第一眼很难察觉到重复

![reusintextures_02.jpg](/images/reusintextures_02.jpg)

图片来源： [https://www.thiagoklafke.com/tutorials/modular-environments/](https://www.thiagoklafke.com/tutorials/modular-environments/)

ID与色板

我们把重用的模块做的粒度更低，用通用的tile来做贴图，非常适合风格化和平面化的渲染。

![5706e641b25198e466f23f0699c5d5d6.png](/images/5706e641b25198e466f23f0699c5d5d6.png)

[https://assetstore.unity.com/packages/tools/painting/click-to-color-72930?aid=1100lHSw&utm_source=aff](https://assetstore.unity.com/packages/tools/painting/click-to-color-72930?aid=1100lHSw&utm_source=aff)

![f59fd5081a950f006e9a08525b969d83.gif](/images/f59fd5081a950f006e9a08525b969d83.gif)

[http://joostdevblog.blogspot.com/2015/11/](http://joostdevblog.blogspot.com/2015/11/)

**GIF与色板**

这种重用的思想同样体现在通用的压缩算法中。比如GIF是一种我们很熟悉的格式，我们可以简单地把它理解成一个字典（查找表）的压缩模式-即重用颜色块。

GIF中会存储一个色板，包含256种不同的颜色。之后图片中每一个像素都会索引到这个色板上的颜色。这样，一个像素不需要存一个RGB三个bytes，而只需要一个索引1byte，节约了存储空间

![b829b75963f7f1070e49254c3ef1da28.png](/images/b829b75963f7f1070e49254c3ef1da28.png)

[https://en.wikipedia.org/wiki/GIF](https://en.wikipedia.org/wiki/GIF)

**量化**

一般一个Float数值占用32位4个byte，即float32。但如果数据精度要求不高，我们可以用更少的位数表示一个数值。比如用float16，2个bytes表示，比如用8位1个byte表示0-255。

例如0.15625这个数值，用float32可以精确表示。不过用8位1byte，如果我们缩放到0-1，那么40/255=0.15686, 39/255=0.15294，最接近的两个数值也都有差距，无法精确表示。

由于精度带来的损失，在颜色渐变上很容易出现banding，即条带化。我们一般可以用dither的方法减少banding的感觉，但其实挺多情况下，即使精度损失的颜色效果依然较难察觉。

![aa262ca70abffedf4b4aba42ccaaef5f.png](/images/aa262ca70abffedf4b4aba42ccaaef5f.png)

[http://joostdevblog.blogspot.com/2015/11/](http://joostdevblog.blogspot.com/2015/11/)

比如在Frostbite的GBuffer中，GB0是R10G10B10A2格式，这样增加了normal的精度，同时A通道4个变量足够表示材质类型了

GB1的A通道，甚至自己pack了一下，前5位给MatData用。

![064f5ffe486a3f5721331f45030c6f07.jpg](/images/064f5ffe486a3f5721331f45030c6f07.jpg)

**特征降维**

同样一组数据，如果我们能用5个数字，损失不大地表示10个数字，那么就可以达到2倍的压缩率。这不同于重用或者量化，在于前者一般是bottom-up的，从模块开始拼装。而特征降维是top-down的，对一个精确的结果进行拟合表示。从这个意义上说，GIF的压缩方法更像是在做特征降维。

一个很好的理解案例是线性回归：我们可以用一根直线近似表示一堆散点。这样虽然损失了精度（有些散点不在直线上），但是节约了存储空间，只需要两个数值：Ax+B就能代表原来很多散点。

![57be5abf7610e9ba8c35b33817b3125e.png](/images/57be5abf7610e9ba8c35b33817b3125e.png)

**Indexed Material**

[https://80.lv/articles/overview-indexed-material-mapping-tecnique/](https://80.lv/articles/overview-indexed-material-mapping-tecnique/)

在这个例子中，作者假设每种材质的颜色，金属度，粗糙度都是相关联的。这样我们可以用一张LUT（这里是一维的）表示一个材质——RGB是颜色，另一张图RG是金属度粗糙度——这样我们用一个统一的UV可以采样这张材质。

比如可以这样理解：0代表锈蚀的金属，1代表没有锈蚀的金属。中间值代表不同锈蚀程度的金属。我们假设完全锈蚀的金属的颜色，金属度粗糙度只有一个取值；没有锈蚀的金属同样如此；以此类推所有不同锈蚀程度的金属都有固定的材质参数（即颜色，金属度，粗糙度）。

这样我们就可以有一个一维LUT代表修饰金属，而物体表面用一张灰度图表示锈蚀程度，用这个锈蚀程度采样材质LUT获得材质参数。

作者这里把16张材质LUT合并在一张贴图上，x轴是类比于修饰程度的某种材质属性，y轴是材质ID。这样物体表面用ID和一张灰度图就可以采样LUT还原出材质参数。

这样从贴图节省程度看，只需要一张BC7了：RG法线，B AO，A 灰度材质属性；变色做在LUT图上。忽略LUT和detail normal，只有一张BC7

而传统方法，一张basecolor，一张法线金属度粗糙度，一张换色Mask+AO，一个BC7两个BC1，比上面的方法多一倍。

不过缺点是，空间换了时间：这种做法会有dependency texture read，shader里不知道会慢多少倍，需要profile。

![Image.png](/images/Image.png)

**Texture PCA**

Bart这里就比较暴力了，直接用PCA分析PBR材质各个通道之间的相关性

[https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/](https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/)

比如我们有一套PBR贴图，它总共有九个通道

![825331a80d702b2be9303da0a99df13d.png](/images/825331a80d702b2be9303da0a99df13d.png)

[https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/](https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/)

我们跑一个SVD分解，一种经典的PCA降维方法，这样可以拿到9个基通道，但其实只有前五个表示了丰富的信息，后面都比较平。

![2b897c23cf71a5de5aa188d8759a5fcb.png](/images/2b897c23cf71a5de5aa188d8759a5fcb.png)

[https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/](https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/)

这样我们可以用五个通道重建出原来的贴图集，这样效果也还不错

我们甚至可以把后面的三个基通道缩小到原来的二分之一，也不太影响最终结果。这样用原来1/3就可以表示原来所有信息。

![2f32f712cbc13b17404eb21bed209a0a.png](/images/2f32f712cbc13b17404eb21bed209a0a.png)

[https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/](https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/)

有一点坏处是，这样运行时会多几次运算，这个例子中，每个通道都会是5个基通道不同权重的混合，多一些加法。不过还好，加减的ALU比较便宜。

上面这两个方法都注意到了材质中，各个通道的相关性，以此为基础做特征降维简化。

**BCn格式与硬件贴图压缩**

BCn是Block Compression的缩写，其基本假设是：贴图在邻近像素间的变化不大。这样就可以拟合临近像素。因此它把贴图分成block存储，每个block中做降维和拟合。 

这种特征降维的方法，非常广泛的应用在硬件贴图格式中，比如DXTC格式(Direct X Texture Compression) ，也就是所有主机和PC显卡应用的压缩格式。以及ASTC，也就是移动端Mali GPU的一种格式。都是基于Block Compression的。

具体来说，比如BC1，按4x4的block存储颜色，每个block用一个线段来拟合。回忆上文的线性回归用一条直线拟合一堆散点。

![fb87eb4444632c726f7d6217baf00001.png](/images/fb87eb4444632c726f7d6217baf00001.png)

[http://www.reedbeta.com/blog/understanding-bcn-texture-compression-formats/](http://www.reedbeta.com/blog/understanding-bcn-texture-compression-formats/)

每个block中会先存两个颜色：颜色空间中一个线段的终点。（2个 R5G6B5的颜色，2bytes）

从这个线段中取了四个颜色，组成一个色板。（每个颜色4bit，相当于上面颜色终点的插值坐标，共2bytes）

每个像素有一个0-3的ID （每像素2bit，总共4bytes）

这样一个block 8bytes。相比于R8G8B8，压缩比是6. 

![e2494fb395a4347243c3254e7394158d.png](/images/e2494fb395a4347243c3254e7394158d.png)

[http://www.reedbeta.com/blog/understanding-bcn-texture-compression-formats/](http://www.reedbeta.com/blog/understanding-bcn-texture-compression-formats/)

![e6fe01a018c4ad8a1a24b5f32cbf51f2.png](/images/e6fe01a018c4ad8a1a24b5f32cbf51f2.png)

这样颜色均一的block效果比较好，但是变化丰富的block就差异比较大了。

后来的各种BC算法基本都是这个思路，对局部颜色进行拟合表示。

**频域分解**

频域分解是信号处理中的一个思想，我们可以用FFT分解把信号从时间空间分解到频率空间表示，这样做处理和分解出需要的信息比较方便。低频信息是变化幅度比较缓慢的，而高频信息是变化迅速的。

高等数学中我们对函数进行泰勒展开，逐项逼近原始函数。低阶的展开表示了总体上的变化，越高阶的展开表示越细节的变化。

美术造型中，我们从全局着眼，先“眯起眼睛”看大比例和轮廓，再逐步细化到细节造型和肌理。

这些都是相同的思想，有很多例子中用这种“频域分解”的思想对贴图进行简化。

我们把一个材质的细节分成低频和高频：高频的细节，可以用四方连续贴图，或者用特殊的贴图表现；低频的细节可以用较小的贴图、精度较低的贴图表现。然后shader中将高频与低频细节混合起来。结合上重用。量化等技巧，达到节约空间的目的。

Detail Normal

一个很基础的方法，我们可以用四方连续的detail normal叠加在材质表面，加强细节的精度。一般在布料和皮肤等细节很多的材质表面都会使用

![54651ca34269e8ec726465c6f7cd0b84.jpg](/images/54651ca34269e8ec726465c6f7cd0b84.jpg)

[https://docs.unrealengine.com/en-US/Engine/Rendering/Materials/HowTo/DetailTexturing/index.html](https://docs.unrealengine.com/en-US/Engine/Rendering/Materials/HowTo/DetailTexturing/index.html)

[https://blog.selfshadow.com/publications/blending-in-detail/](https://blog.selfshadow.com/publications/blending-in-detail/)

[https://docs.unity3d.com/Manual/StandardShaderMaterialParameterDetail.html](https://docs.unity3d.com/Manual/StandardShaderMaterialParameterDetail.html)

Layered Material

我们用一层较为低频的Mask，混合两张四方连续的贴图。这样能让远看不至于过于单调，但同时近处又精度较高。地形上非常常用

比如UE这个例子中设个顶点色混合的石头

![3956fd147b77c3b1b0510a5d939c4d05.png](/images/3956fd147b77c3b1b0510a5d939c4d05.png)

[https://docs.unrealengine.com/en-US/Engine/UI/LevelEditor/Modes/MeshPaintMode/VertexColor/MaterialSetup/HowTo/2TextureMaterial/index.html](https://docs.unrealengine.com/en-US/Engine/UI/LevelEditor/Modes/MeshPaintMode/VertexColor/MaterialSetup/HowTo/2TextureMaterial/index.html)

Decal

一种方式是，将低频的材质部分用连续贴图表现，而高频的部分拆成Decal，贴在材质表面表现细节。

比如Fallout3中这个案例

![9f990b322a938b72e545aacc2b3a7797.png](/images/9f990b322a938b72e545aacc2b3a7797.png)

其实石头的模型和贴图都很简单，但边缘上面贴了破损的decal

![13c4c89b1f35741c67f8b695994d92a3.png](/images/13c4c89b1f35741c67f8b695994d92a3.png)

[https://simonschreibt.de/gat/fallout-3-edges/](https://simonschreibt.de/gat/fallout-3-edges/)

JPG格式

JPG格式是一个经典的利用频域分解以后，在频域空间做量化来节省存储空间的方法。

具体来说，它会将RGB图片分解为YCbCr格式，做一次量化；然后用DCT，每个block分解到频域空间（右图），再做一次量化。以此方法一般图片甚至能到十倍的压缩比，图片越简单（频域空间更简单）压缩比更高。

不过由于解码比较复杂，一般GPU硬件上不会使用这种方法，而一般还是BCn的方法。

![f7b037badc7a460f211d928f1ef74d4d.png](/images/f7b037badc7a460f211d928f1ef74d4d.png)

[https://cgjennings.ca/articles/jpeg-compression/](https://cgjennings.ca/articles/jpeg-compression/)

总结

本文列举了一些常见的优化贴图的技巧，与常见图片格式背后的原理。一般来说，UV，低模，贴图，Shader方面是TA比较好做优化的方面。而涉及到引擎部分，看团队能力，看分工，就不一定了。我们讨论的制作管线中，很大程度是为了节约贴图，节约内存，提高精度，提高丰富度。但也取决于游戏类型，团队经验，并没有非常统一的标准。因笔者比较少见国内TA讨论这方面的内容，故做一总结，欢迎补充，也希望对读者有帮助。

参考资料

[https://software.intel.com/content/www/us/en/develop/articles/modular-concepts-for-game-and-virtual-reality-assets.html](https://software.intel.com/content/www/us/en/develop/articles/modular-concepts-for-game-and-virtual-reality-assets.html)

[https://www.thiagoklafke.com/tutorials/modular-environments/](https://www.thiagoklafke.com/tutorials/modular-environments/)

[https://assetstore.unity.com/packages/tools/painting/click-to-color-72930](https://assetstore.unity.com/packages/tools/painting/click-to-color-72930?aid=1100lHSw&utm_source=aff)

[http://joostdevblog.blogspot.com/2015/11/](http://joostdevblog.blogspot.com/2015/11/)

[https://en.wikipedia.org/wiki/GIF](https://en.wikipedia.org/wiki/GIF)

[https://80.lv/articles/overview-indexed-material-mapping-tecnique/](https://80.lv/articles/overview-indexed-material-mapping-tecnique/)

[https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/](https://bartwronski.com/2020/05/21/dimensionality-reduction-for-image-and-texture-set-compression/)

[http://www.reedbeta.com/blog/understanding-bcn-texture-compression-formats/](http://www.reedbeta.com/blog/understanding-bcn-texture-compression-formats/)

[https://docs.microsoft.com/en-us/windows/win32/direct3d11/texture-block-compression-in-direct3d-11](https://docs.microsoft.com/en-us/windows/win32/direct3d11/texture-block-compression-in-direct3d-11)

[https://docs.unrealengine.com/en-US/Engine/Rendering/Materials/HowTo/DetailTexturing/index.html](https://docs.unrealengine.com/en-US/Engine/Rendering/Materials/HowTo/DetailTexturing/index.html)

[https://docs.unity3d.com/Manual/StandardShaderMaterialParameterDetail.html](https://docs.unity3d.com/Manual/StandardShaderMaterialParameterDetail.html)

[https://docs.unrealengine.com/en-US/Engine/UI/LevelEditor/Modes/MeshPaintMode/VertexColor/MaterialSetup/HowTo/2TextureMaterial/index.html](https://docs.unrealengine.com/en-US/Engine/UI/LevelEditor/Modes/MeshPaintMode/VertexColor/MaterialSetup/HowTo/2TextureMaterial/index.html)

[https://simonschreibt.de/gat/fallout-3-edges/](https://simonschreibt.de/gat/fallout-3-edges/)

[https://cgjennings.ca/articles/jpeg-compression/](https://cgjennings.ca/articles/jpeg-compression/)
