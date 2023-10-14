---
title: Post Processing with Fast Neural Style Transfer in Unity | Unity中快速神经风格迁移后处理
date: 2018-12-17 00:00:00
---

1 NNPP with FNST 快速神经风格迁移后处理

承接上文用GAN训练后处理，其实那篇也算是一种风格迁移吧，只不过风格损失函数在NST中定义为最大均值差，在GAN中定义为一个熵，用discriminator表示。

2 Fast Neural Style Transfer

基本上是基于[Perceptual Losses for Real-Time Style Transfer and Super-Resolution](https://arxiv.org/abs/1603.08155)这篇文章，

![32bee379a3379a73f6fedf5d8b1d01d3.png](/images/32bee379a3379a73f6fedf5d8b1d01d3.jpg)

与Gatsy最早的文章A Neural Algorithm of Artistic Style不同的是，本文提出用一个神经网络做生成器，训练时候loss函数与原来一样，区别在于更新的不是loss network的输入图片，而是生成器的权重。这样生成好的生成器就可以离线将图片生成为风格化图片

![1ba922f7f3c1ee9314a5f85c4dbe1823.jpg](/images/1ba922f7f3c1ee9314a5f85c4dbe1823.jpg)

和pix2pix很像了，pix2pix的generator就是FNST的transform net，pix2pix的discriminator就是FNST的loss network。区别只是loss的计算方式，FNST是最大均值差，pix2pix中discriminator就是一个熵的计算器

3 实现

和上文很相似，不过这里tranformnet/generator相对更复杂一点

甚至原文中transform net有3层conv，3层deconv和5层residual block

![52efa83b482a3ba26305a958ec809006.png](/images/52efa83b482a3ba26305a958ec809006.jpg)

不过本文这里为了加快离线运算，只用了3层conv，3层deconv和2层residual block，filter数量也减少了三倍

![wave_crop_architecture.png](/images/wave_crop_architecture.jpg)

最后512*512在GTX980上大概能到20FPS吧，仍然比较慢，而且效果还不是很好。只能说目前可能算力还达不到了。

至于实现方法，是原生Compute Shader的，并没有用Caffe2Go的CPU方法或者cudnn加速库。除了Conv2d的实现稍微绕以外，只写正向传播一点也不复杂。

详见Github项目
