---
title: Tensorflow/Pytorch in Houdini | Houdini中使用Tensorflow/Pytorch
date: 2019-01-26 00:00:00
---

Houdini作为最好的程序化建模软件，又正好深度学习框架大部分在Python中，那么进行一些建模/图形的深度学习任务时，怎么能少得了在Houdini？然而有几乎没有文章讲如何在Houdini中使用Tensorflow或者Pytorch，本文聊一聊这个。

笔者查到的唯一一篇文章是这个：

Houdiniで機械学習 with TensorFlow

[https://qiita.com/takavfx/items/f27cd76604e902199c9d](https://qiita.com/takavfx/items/f27cd76604e902199c9d "https://qiita.com/takavfx/items/f27cd76604e902199c9d")

作者在Houdini里搭建了一个Minst识别程序。本文先不讲应用，主要是操作步骤，下一篇再讲应用

首先一个问题是，Windows下行不行？

笔者感觉，想直接在Houdini里写Python，似乎不能用Windows。主要原因是Windows版本的Houdini使用的一个特殊编译的Python2.7.5版本，一些其它python版本预编译的package会导致houdini闪退。如果想在Windows下部署，似乎只能考虑本地RPC的方式，或者在云端部署深度学习服务。

因此和takavfx的方法一样，在Linux下部署！

另外一个问题是blinux下安装C一些版本比较新的package会导致闪退，所以都不能安装最新版

本文推荐的环境：

Ubuntu 18.04 LTS

Houdini 16.5.634 ->17.0遇到TF有概率闪退

Tensorflow 1.5.0 ->1.10.0肯定闪退

Pytorch 0.4.0

CUDA 9.0 ->用cpu计算就不需要

cuDNN 7.05 ->用cpu计算就不需要

基本思路是：在Virtualenv下安装深度学习库，然后用virtualenv启动Houdini，这时houdini的python就是系统的python了，可以使用当前virtualenv下的package

1.Houdini 安装

视频下面有网盘

[https://www.bilibili.com/video/av33722718/](https://www.bilibili.com/video/av33722718/ "https://www.bilibili.com/video/av33722718/")

houdini16.5破解文件和破解方法同样，安装包可以在官网下载

[https://www.sidefx.com/download/daily-builds/#category-gold](https://www.sidefx.com/download/daily-builds/#category-gold "https://www.sidefx.com/download/daily-builds/#category-gold")

笔者用的

houdini-16.5.634-linux_x86_64_gcc4.8.tar.gz

记得安装完在环境变量中加一下安装路径，这样才能terminal启动houdini

笔者直接改的etc/environment这个文件，PATH最后加上

:/opt/hfs16.5.634/bin

然后命令行启动houdini，打开python shell应该是2.7.15

![20f4c867248ce1eebc572741e281388b.png](/images/20f4c867248ce1eebc572741e281388b.png)

如果在windows的话大概是2.7.5

2. Virtualenv

首先建议装virtualenv和virtualenvwrapper

sudo pip install virtualenv

sudo pip install virtualenvwrapper

然后分别建两个virtualenv

mkvirtualenv tf-houdini --python==2.7

deactivate

mkvirtualenv torch-houdini --python==2.7

deactivate

3. GPU库

先是CUDA9.0，为什么这个版本，因为它和tf1.5匹配。。。

有文章说CUDA9.0必须gcc6-，所以要降级系统的gcc，笔者好像没有做这一步也行，还在使用gcc7.3

从官网上把安装包下下来

[https://developer.nvidia.com/cuda-90-download-archive?target_os=Linux&target_arch=x86_64&target_distro=Ubuntu&target_version=1604&target_type=runfilelocal](https://developer.nvidia.com/cuda-90-download-archive?target_os=Linux&target_arch=x86_64&target_distro=Ubuntu&target_version=1604&target_type=runfilelocal "https://developer.nvidia.com/cuda-90-download-archive?target_os=Linux&target_arch=x86_64&target_distro=Ubuntu&target_version=1604&target_type=runfilelocal")

切到下载路径，然后

sudo sh cuda_9.0.176_384.81_linux.run

一路ok就好

官网上还有四个补丁包，下不下均可，笔者没下照样能跑

然后要修改一下环境变量

有很多种方法，笔者直接改的etc/environment这个文件，PATH最后加上

:/usr/local/cuda-9.0/bin

之后下载cudnn7.05，为什么这个版本？因为它跟tf1.5匹配。。。。

[https://developer.nvidia.com/compute/machine-learning/cudnn/secure/v7.0.5/prod/9.0_20171129/cudnn-9.0-linux-x64-v7](https://developer.nvidia.com/compute/machine-learning/cudnn/secure/v7.0.5/prod/9.0_20171129/cudnn-9.0-linux-x64-v7 "https://developer.nvidia.com/compute/machine-learning/cudnn/secure/v7.0.5/prod/9.0_20171129/cudnn-9.0-linux-x64-v7")

下载完解压后，用命令行把文件拷到对应目录，改权限

sudo cp cuda/include/cudnn.h /usr/local/cuda/include

sudo cp cuda/lib64/libcudnn* /usr/local/cuda/lib64

sudo chmod a+r /usr/local/cuda/include/cudnn.h /usr/local/cuda/lib64/libcudnn*

4. 安装tensorflow

切到tf-houdini

workon tf-houdini

装一下

如果只用cpu的话：

pip install tensorflow==1.5.0

如果用gpu就装上

pip install tensorflow-gpu==1.5.0

好了！测试一下！

命令行启动

houdini

打开python source editor，试一下

import tensorflow as tf

hello = tf.constant('Hello, TensorFlow!')

sess = tf.Session()

print (sess.run(hello))

with tf.device('/device:GPU:0'):

    a = tf.constant([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], shape=[2, 3], name='a')

    b = tf.constant([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], shape=[3, 2], name='b')

    c = tf.matmul(a, b)

sess = tf.Session(config=tf.ConfigProto(log_device_placement=True))

print(sess.run(c))

然后terminal就会打出log了！

![83fd03565177409fad8345935d1614c4.png](/images/83fd03565177409fad8345935d1614c4.png)

5. 安装pytorch

不太好用conda，还是得手动

在官网上找一个老的版本

[https://pytorch.org/get-started/previous-versions/](https://pytorch.org/get-started/previous-versions/ "https://pytorch.org/get-started/previous-versions/")

笔者用的

torch-0.4.0-cp27-cp27mu-linux_x86_64.whl

切到torch的virtualenv

workon torch-houdini

切到刚下载的文件路径

pip install torch-0.4.0-cp27-cp27mu-linux_x86_64.whl

等待安装好，命令行打开houdini

打开python source editor，试一下

import torch

x = torch.Tensor([1.0])

xx = x.cuda()

print(xx)

from torch.backends import cudnn

print(cudnn.is_acceptable(xx))

![9078a724a6e6efa2ad5f82e1e669549a.png](/images/9078a724a6e6efa2ad5f82e1e669549a.png)

terminal返回结果！成功！
