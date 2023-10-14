---
title: Procedural Parcel Modelling In Houdini | Houdini中程序式生成街区地块
date: 2018-08-29 00:00:00
---

上文讲到了如何程序式生成街道，那么下一步就是将街区划分为地块。实际中的街区形态多种多样，又以三种最为典型。一种是地块平铺在街区中，自发形成内部道路，姑且称为平铺式。另一种是地块面向街区外侧，成环状，姑且成为周边式。第三种，整个街区并没有划分地块的产权，而是整体开发了，姑且称为独立式。

平铺式以北京就成四合院为典型，主干街道划分了街区，每个街区内部自发形成了胡同。

![timg.jpg](/images/timg.jpg)

周边式在很多西方文艺复兴之后的城市中比较常见，得益于规范的城市规划体系。当代城市中又以巴塞罗那最为典型

![201503141019372295.jpg](/images/201503141019372295.jpg)

至于第三种独立式，就是北京最为典型了，一个没有街道的城市。公共道路划分的街区都整体交给开发商，要么盖办公楼，要么盖居住小区，没有街道立面，都是独立街区。

第三种没什么好讲的，因为街块不用划分，但是前两种的街块划分就需要程序式生成了。

至于实现，前人有很多种方式，比如Parish/Muller使用L-System/ShapeGrammer生成了地块的划分，不过没有细讲。这也是CityEngine中的实现方式。Vanegas提供了比较详细的实现方法，本文也是基于这篇论文的方法重现的。

周边式

原始街区

![a4cbf54f81fc9f7b952f1ce1e9c43ccf.png](/images/a4cbf54f81fc9f7b952f1ce1e9c43ccf.jpg)

分这么几步：

1 skeleton

作者用的CGAL库的方法，不过这个库的python wrapper版本不全没这功能，houdini里大概是没法用了。

好在houdini自带一个polyexpand2d的节点可以直接生成skeleton

![5c4515ac539abac9567ab83b36a1b49c.png](/images/5c4515ac539abac9567ab83b36a1b49c.jpg)

然后把同一条边上的组合在一起，在论文里叫A-Strip，这时很像一个屋顶，原文4.2.1节

![ec954dff46eea61e9b8737450b56d001.png](/images/ec954dff46eea61e9b8737450b56d001.jpg)

之后把很多斜角做掉，这一步在论文里叫B-Strip，4.2.2节

![01768e9a177532af8e4356f049a9ca09.png](/images/01768e9a177532af8e4356f049a9ca09.jpg)

那之后就是划分了，沿面街的线按一定距离等分，见原文4.2.3节

![7951b7ef439993819142bd822c86f029.png](/images/7951b7ef439993819142bd822c86f029.jpg)

最后划分完的结果！

![abeff27336cf3dafecc2b0b70e598178.png](/images/abeff27336cf3dafecc2b0b70e598178.jpg)

平铺式

在4.3节中，是一种按照object-oriented bounding box的中线递归划分的方式，算法相较上一种周边式是简单多和稳定度了，上面那个参数要调很久还有很多bug。。。。

对于每一块，houdini的bound节点直接可以找oriented bounding box，沿中线划分一下就好了。

![7e641b186d4caacdffefd834b240b50d.png](/images/7e641b186d4caacdffefd834b240b50d.jpg)

对这种不规则的地块划分完其实比较诡异。。。。还是稍方正或者长条形的效果比较好

![309c8d8499964d2c58fc480a6076c714.png](/images/309c8d8499964d2c58fc480a6076c714.jpg)

![192468d07479a80b90ccaeef7ffb22bb.png](/images/192468d07479a80b90ccaeef7ffb22bb.jpg)

一个大佬的C#实现

[http://martindevans.me/game-development/2015/12/27/Procedural-Generation-For-Dummies-Lots/](http://martindevans.me/game-development/2015/12/27/Procedural-Generation-For-Dummies-Lots/)

![road-Redshift.png](/images/road-Redshift.jpg)

Parish Y. I H. Procedural Modeling of Cities[J]. Computer Graphics, 2001.

Vanegas C A, Kelly T, Weber B, et al. Procedural Generation of Parcels in Urban Modeling[J]. Computer Graphics Forum, 2012, 31(2pt3):681-690.
