---
title: Realtime Grass Rendering on Mobile Platform| 移动端实时草地渲染
date: 2017-10-15 00:00:00
---

有很多种不同的技术。相关参考一个是 Rendering Fields of Grass using DirectX11 in GRID Autosport (RFGinAutosport)

官方示例Adam也是用的GPU生成的技术

最近知乎有篇文章：[https://zhuanlan.zhihu.com/p/29632347](https://zhuanlan.zhihu.com/p/29632347)

Unity Store上有一些示例，比如

Rendering Grass in Real Time with Dynamic Lighting

[http://www.kevinboulanger.net/grass.html](http://www.kevinboulanger.net/grass.html)

2006年的文章，主要有几点：dynamic light, density, shadow, LOD

1. 分成三级LOD，

![6e1ef5acfe92a1f6228101ad4a5d3e06.png](/images/6e1ef5acfe92a1f6228101ad4a5d3e06.jpg)

近距离就是几何体

![dc9af215d6c231d146be868af41516a1.png](/images/dc9af215d6c231d146be868af41516a1.jpg)

8个面，alpha-test的贴图

中距离是插片，用了一个bidirectional texture funtion，定义了五个灯光和两个视角方向的贴图，中间的插值spherical barycentric

![850165ed53e7de7360f51a7b7535d96f.png](/images/850165ed53e7de7360f51a7b7535d96f.jpg)

远距离就是贴地

1. 密度管理用了一张density map

![6408f7af430285bafba46d5649210ee1.png](/images/6408f7af430285bafba46d5649210ee1.jpg)

![383652835b5066f6ed530a27008e3a43.png](/images/383652835b5066f6ed530a27008e3a43.jpg)

1. 近距离shadowmap太费了，所以预先烘焙了一张occluder，每个草旁边一个圆柱体，用光线去采样

![cf19fd0c54b78f52524df0cd245d5c2d.png](/images/cf19fd0c54b78f52524df0cd245d5c2d.jpg)

思路上可以借鉴的：

- LOD
- 插片BTF
- density map的思想

没啥意义的：

- alphatest草，mobile上毕竟太费了
- 实时投影计算，预先计算的话也太耗了，128*128的occuluder话，单通道一张图ETC5压缩，2kb，10k草就是20mb啊，而且drawcall没法batch

第二个是GPU gem上的

[https://developer.nvidia.com/gpugems/GPUGems/gpugems_ch07.html](https://developer.nvidia.com/gpugems/GPUGems/gpugems_ch07.html)

Rendering Countless Blades of Waving Grass

![81bcfeeba2a11274a7e7113a49371961.jpg](/images/81bcfeeba2a11274a7e7113a49371961.jpg)

1. 草用一个透明贴图

![a6c9d7add4706057988add72188400ab.jpg](/images/a6c9d7add4706057988add72188400ab.jpg)

1. 所有草都是三插片

![760f81b082461a6ab1ba14001fbd1771.jpg](/images/760f81b082461a6ab1ba14001fbd1771.jpg)

动画建议的方法是顶点动画，但是顶点要记录整个草的中心，避免贴图的扭曲变形，其实也没啥参考价值。

主要的意义在于提出草插片。

第三个是Rendering Fields of Grass using DirectX11 in GRID Autosport (RFGinAutosport)

2014年的游戏，PS3/XBox 360平台。

![a9e155a405d07fb4ef0ef7b318e6fac3.png](/images/a9e155a405d07fb4ef0ef7b318e6fac3.jpg)

主要要点如下：

1. 美术制作densitymap，rgb记录颜色，alpha记录高度。整个地图一张2k

![bd4bad50e3e1b8ea4d55b1ce617d610d.png](/images/bd4bad50e3e1b8ea4d55b1ce617d610d.jpg)

1. 主相机上方架一个垂直向下正交的相机拍地面，渲RenderTexture，用这张RT，Compute Shader取每个像素作为草的底坐标。当然会做一些随机，根据相机视野做一下裁剪。还会生成LOD。

![252731da3a3b7d180a5f06cb4c3f6e6a.png](/images/252731da3a3b7d180a5f06cb4c3f6e6a.jpg)

![bd0e4b68ffbed1bb5ed5d1bf647a2446.png](/images/bd0e4b68ffbed1bb5ed5d1bf647a2446.jpg)

![023be0ddc2d9b362bf66deea73c8337d.png](/images/023be0ddc2d9b362bf66deea73c8337d.jpg)

1. Compute Shader输出草信息的struct到一个AppendStructuredBuffer。这个buffer交给shader，用instanceID取信息。一个trick是drawindirect时候，避免高instance低顶点数，CPU里调相当于unity的DrawProcedurallyIndirect渲染
2. 草的几何信息是hardcode进vertexshader的.

![d413f8c1dc7063b748d739edc3078f5c.png](/images/d413f8c1dc7063b748d739edc3078f5c.jpg)

1. screen-space shadow去采样投影，一个instance一个投影
2. 车轮轧过应该草高度会降低，变形方法是：渲一个F32高度图，每帧更新车轮位置，然后放进生成阶段，compute shader里计算高度

![bcd828e2d996ab3b7bf05a3838a65946.png](/images/bcd828e2d996ab3b7bf05a3838a65946.jpg)

优点：

- 没有alpha-test，mobile上可以考虑
- 美术流程完整
- 裁剪和LOD非常有新意

缺点：

- 没啥，这个笔者基本在unity移动端能复现
- 没考虑地形起伏，笔者经验是要做高度差值
- 顶视相机连续移动的话，采样率高于densitymap分辨率，单草还好，如果两个densitymap混合 一个草一个石头 就会抖动

第四个是Adam，unity官方demo，asset store有下载

和RFGinAutosports比较相似

1. 直接用的unity terrain系统，不过terrian分成了一个个patch，每次会渲染主相机周边一些patch上的草，没有扇面裁剪
2. densitymap之类的是写进terrain的control map的，有意思的是每层数据可能就2-4位，用mask编码到16位里
3. 和RFGinAutosports一样，用compute shader生成草的位置信息
4. 不过不是渲染草blade，而是AlphaToMask的插片草，不用geom shader

优点：

- density-map采样比较稳定，因为直接是按patch了
- control-map用掩码编码成16位的方式比较有意思
- 美术流程比较完整

缺点：

- 没考虑移动端，alpha-test会挂

第五个是知乎上的文章[https://zhuanlan.zhihu.com/p/29632347](https://zhuanlan.zhihu.com/p/29632347)

1. 三级LOD按面数分，hardcode进geom shader

![69b2c2dfcea2110b5dd12e03a6f14e14.jpg](/images/69b2c2dfcea2110b5dd12e03a6f14e14.jpg)

1. AlphaToMask贴图

![887f7130504c1b9e72ca9d204b37996d.jpg](/images/887f7130504c1b9e72ca9d204b37996d.jpg)

1. CPU按mesh顶点生成草位置

![a45c35f74f85d3082ba7f15c9b48757e.jpg](/images/a45c35f74f85d3082ba7f15c9b48757e.jpg)

1. 风是正弦顶点运动，高度相关

优点：

- 考虑了LOD

缺点

- alphatest在移动平台不太能接受
- 没考虑美术流程
- 位置生成用cpu，比较费

第六 Zelda

![30b775dc6554a634b557850707db7547.jpg](/images/30b775dc6554a634b557850707db7547.jpg)

很厉害，没有文章讲他们是怎么做的。。。。

第七 自己的实践

1. terrain系统自带detail数据，这样就可以直接美术刷density，渲染时候再换成其它mesh
2. 不用terrain的话，可以用replace shader，顶视相机抓mesh地形的顶点色生成control map。需要注意的是，顶视相机估计渲的比较小，可能就256，要考虑采样频率低时的噪声问题
3. 直接用低模型草。另外两种方法呢，alpha-test移动端比较费，要不hardcode进vertex/geom shader美术又不好控制
4. 5.5版本的unity，metal不能用compute shader。所以只能用cpu生成草DrawMeshInstancing，因为DrawMeshInstancing指定传matrix占用cbuffer，一个batch只能125instance，所以为了降drawcall最好给草丛而不是单棵草做instance。
5. 地形有起伏的话，高度要插值。如果compute shader插得话，bilinear interpolation就有很好的效果了。如果5.5在cpu，就不要插值了，cpu上terrain自带的interpolate height挺费的。可以直接每个densitymap的位置指定一个高度，只是vertex shader里做平面随机。
6. LOD和扇面裁剪是很好的思路可以应用。
7. 我的经验是，就算是用5.5，没有compute shader，A9上也完全无压力。

自己的测试场景一样有有些区别。同样有主相机垂直向下的相机，不过用Replace Shader渲SplatMap。因为地面是mesh，用顶点色控制的混合，所以直接可以抓顶点色渲splatmap。抓到splatmap同样是compute shader生成位置信息。不过为了美术可控，要两种物体来分布，所以输出的是两个AppendStructuredBuffer。Unity里用DrawMeshInstancedIndirect来渲染，全在一个commandbuffer里。 用的mesh是直接美术控制的。和有一点RFG差别是由于地面起伏不平，我需要自己用相机抓深度图，自己算深度，而且随机到位置因为不在格点上，还得自己做Bilinear差值。 另外还有一点问题，splatmap频率比较高，但是相机精度太低(128-256)，所以相机跟随移动时会有噪声。理论上采样要2倍于原有频率，这里肯定不行。所以有些地方到底是草还是石头经常闪。一个解决方案让相机位置不连续运动，每次跳的距离和相机texel值倍数，这样纠正保证连续了。但是由于浮点精度问题，经常跑着跑着就偏了。

在LX7里，不能用compute shader。所以位置信息不能用像素到坐标的方法。好在它用的terrain系统起伏不是很大，而且数据存储频率很低，整个地形才1024的detailmap，所以肯定不会有频率错位问题。用的5.5版本，只能DrawMeshInstanced。CPU根据玩家位置采detailmap，根据密度实时生成草数量，交给shader。位置左右偏移随机和旋转随机均是gpu中完成。其实有一点问题，因为左右偏移只是水平的，不会有高度变化。但由于地形起伏不大，也没啥问题。

知乎里的文章，是用一个mesh顶点，交给shader，用geom shader生成草的形状。渲染用的AlphaToMask。也不用考虑分布密度、美术如何处理、渲染效率、移动平台。其实没啥用。

[GrassSpawner.cs](./file/GrassSpawner.cs)

[GrassInstance.shader](./file/GrassInstance.shader)

[GrassSpawnerPreview.cs](./file/GrassSpawnerPreview.cs)
