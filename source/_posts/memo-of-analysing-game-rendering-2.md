---
title: Memo of Analysing Game Rendering 2 | 分析游戏渲染的姿势备忘之二
date: 2018-03-04 00:00:00
---

Nsight，NV的Graphic Debugger

使用方法：VS新建一个工程，项目属性的Nsight Property，设成external program，连到运行的程序

运行！

然后vs里有capture current frame，就可以看了！

![836fc0e1620effa27000e1decea30c8c.png](/images/836fc0e1620effa27000e1decea30c8c.png)

![089210c778efde5435f4a61887680b1d.png](/images/089210c778efde5435f4a61887680b1d.png)

草的倒伏有一张法线图！

![47202630ee83dfe3190d378d67ee285b.png](/images/47202630ee83dfe3190d378d67ee285b.png)

terrain的virtual texturing

![6a8bb7b502fc00032453932ee9dc57f8.png](/images/6a8bb7b502fc00032453932ee9dc57f8.png)

嗯草是一个patch一个patch画的

![33812c5552eb70ac88b60f3608c33033.png](/images/33812c5552eb70ac88b60f3608c33033.png)

塞尔达用CEMU运行的可以。

居然有4000DC，但是顶点数据很奇怪抓不出来

Steam的游戏需要选上 islauncher

然后运行，找到需要的process

![f6368a9f3211dd820ee24525fcedba4c.png](/images/f6368a9f3211dd820ee24525fcedba4c.png)

steam的游戏可能会需要

GameOverlayRender。dll啥

![2920c1cda79f0473f0ab72987a61112f.png](/images/2920c1cda79f0473f0ab72987a61112f.png)

依然能抓出来

![65067fe7cd8a9587bb00b5377543e97a.png](/images/65067fe7cd8a9587bb00b5377543e97a.png)

DX渲染的，模型都能抓出来，而且模型数据很全

CEMU模拟器的

[https://www.thenerdmag.com/download-the-legend-of-zelda-botw-on-pc/2/](https://www.thenerdmag.com/download-the-legend-of-zelda-botw-on-pc/2/)
