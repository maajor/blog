---
title: Houdini Terrain 2 | Houdini地形生成之二
date: 2017-12-03 00:00:00
tags:
  - Houdini
  - Technical
  - Procedural Generation
  - Game Development
  - Terrain
---

Houdini制作地形基本可以代替WorldMachine，而且可以更方便地控制。

其一是drawmask节点直接可以手绘蒙版，

其二是数据可以写VEX直接控制，比如项目用的gamma工作流，导出高度图时要encode gamma，直接VEX写了，

其三是erode可以在不同的分辨率上进行多次。

唯一的遗憾是没有WorldMachine里生成积雪的节点。

另外可能WM是GPU计算，比较快。而Houdini（好像也是OpenCL?）感觉稍微慢一些。还会存每一步模拟的数据，比较吃内存。

另外操作上有点区别是，WM的蒙版就在那里，每次从同一个地方拽出来。Houdini可以把数据直接存起来，这样地形可以有多层数据，Height是高度，Mask是蒙版，顺便自定义一堆蒙版。这样每次用蒙版的时候，copy layer出来。

![f52ff73e99bc89434001691c744cf8e7.png](/images/f52ff73e99bc89434001691c744cf8e7.jpg)

![3575a52d104dfb5decec748ad38b42d5.png](/images/3575a52d104dfb5decec748ad38b42d5.jpg)

还有一个麻烦是是noise没法定义起始高度，只能自己拉一个平面加上噪声，再layer加起来。

layer对应combiner

![c9c41e3fcb44a7da23a37f8c35393b77.png](/images/c9c41e3fcb44a7da23a37f8c35393b77.jpg)

![ae9cf6fb48de04bb10ead84f3dc4f017.png](/images/ae9cf6fb48de04bb10ead84f3dc4f017.jpg)

mask blur expand shrink

对应wm里expand blur

![4f0a9c589406c10f6b40003543975e32.png](/images/4f0a9c589406c10f6b40003543975e32.jpg)

![6598ad3dc8d0a65f018a32e9633d98a2.png](/images/6598ad3dc8d0a65f018a32e9633d98a2.jpg)

erode对应natural

![2087b3654785b2b4db0fff2f0b79c2c7.png](/images/2087b3654785b2b4db0fff2f0b79c2c7.jpg)

![d0aade267f31582f62a04ea46b28d0cf.png](/images/d0aade267f31582f62a04ea46b28d0cf.jpg)

remap和VEX对应filter

![fbdfb372a2346c601f89e9fe10eb29e4.png](/images/fbdfb372a2346c601f89e9fe10eb29e4.jpg)

![7b9c87c92496a1846a38a69542ae542d.png](/images/7b9c87c92496a1846a38a69542ae542d.jpg)

![1c222086025be04936f04b6746abe55d.png](/images/1c222086025be04936f04b6746abe55d.jpg)

mask by feature对应selector

![775eb84c80322b941f8f3e88a8a1f869.png](/images/775eb84c80322b941f8f3e88a8a1f869.jpg)

![5389617d5c1aef36915de6c12ad6dbca.png](/images/5389617d5c1aef36915de6c12ad6dbca.jpg)

noise和pattern对应Generator

![bfb7b06bc17c499d389316639a36b526.png](/images/bfb7b06bc17c499d389316639a36b526.jpg)

![3cc48988974ebe99e80832db21923b8b.png](/images/3cc48988974ebe99e80832db21923b8b.jpg)

draw mask对应layout generator

![84c87a1fc7665b08274a2a8f5cf386c6.png](/images/84c87a1fc7665b08274a2a8f5cf386c6.jpg)

![488574f076fc8023770dc4cf7351e6dc.png](/images/488574f076fc8023770dc4cf7351e6dc.jpg)
