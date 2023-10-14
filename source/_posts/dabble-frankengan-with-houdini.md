---
title: Dabble FrankenGAN with Houdini | Houdini中测试FrankenGAN
date: 2019-01-18 00:00:00
---
# 20190117 FrankenGan with Houdini

本文尝试在Houdini中测试和实现FrankenGan的（部分）功能

首先介绍一下这篇文章

FrankenGAN: Guided Detail Synthesis for Building Mass-Models Using Style-Synchonized GANs

发表在刚刚结束的Siggraph Asia 2018.

基本思路是：用GAN训练神经网络，给粗糙的建筑体块模型添加模型和贴图细节。

源码在Github上有，

前端是java写的：[https://github.com/twak/chordatlas](https://github.com/twak/chordatlas "https://github.com/twak/chordatlas")，显示和资源管理等任务

后端是pytorch：[https://github.com/twak/bikegan](https://github.com/twak/bikegan "https://github.com/twak/bikegan")，完成GAN生成的任务

![b24dc7e21ca31997ffd7d8a373b1f4c3.png](/images/b24dc7e21ca31997ffd7d8a373b1f4c3.jpg)

作者将添加细节这个操作分成了很多步，每一步都训练了一个bicycleGAN完成任务

首先会对立面和屋顶进行标注，区分语义。之后通过标注生成贴图。最后用超分辨率提高分辨率。总共9个GAN!

预训练的模型原作都有给出，在[http://geometry.cs.ucl.ac.uk/projects/2018/frankengan/data/franken_nets/](http://geometry.cs.ucl.ac.uk/projects/2018/frankengan/data/franken_nets/ "http://geometry.cs.ucl.ac.uk/projects/2018/frankengan/data/franken_nets/")

使用bikegan那个工程也会自动下载

生成label这一步有一个特殊操作，为了让输入的图片有尺度信息，输入多加了一个channel，是立面上每一点到立面边缘的距离

![7ccf25abfd720cb727275b67d2063806.png](/images/7ccf25abfd720cb727275b67d2063806.jpg)

这一步在bikegan中是自动生成的

![5608aa62942278dee2c6377f7e049075.png](/images/5608aa62942278dee2c6377f7e049075.jpg)

具体来说这九个GAN做了空白->标注，标注->图片的任务

当然了，GAN标注的label并不那么可靠，还是需要一定的正则化

![446a29363dae70b58afeb3443673aca4.png](/images/446a29363dae70b58afeb3443673aca4.jpg)

立面的训练用了CMP数据集，大概3000张标注图片。屋顶用了600张，窗框用了1400张，都是人肉标注的。

(其实还好，一千张的话一个人一星期就能标注出来-笔者注）

最终的效果：

![a8334f40ced7ef03217d123874d9a7a2.png](/images/a8334f40ced7ef03217d123874d9a7a2.jpg)

看上去效果还不错。

最后评论一下：

这篇论文讲了怎么给草模添加细节，那么草模怎么来的？

笔者当然是用他自己的算法了，在另一篇BigSUR的论文里讲了，大概是从Lidar等扫描数据正则化得来的。

另一种方法是传统Procedural的方法，比如CityEngine生成体块模型。

反思一下，为什么非要用GAN？

给一个空白的立面，传统Procedural的方法对立面进行语义划分也很好啊。用GAN最后也得正则化。笔者倒认为用传统Procedural可能更快效果更好，省去了找数据集和训练的时间。

那么贴图生成为什么非要用GAN？

当然在游戏里这不太可能，肯定要考虑模型和贴图的共用。就目前，游戏里肯定还是自底向上模块化拼接比较好。只有在对资源不敏感的比如离线环境中，这倒是可能可以快速生成贴图。毕竟如果只作为背景资产，精度就无所谓了，这个生成的肯定比纯色模型好。

笔者做的很初步，只是一个技术验证，是在Houdini中把原作其中一个给立面做标注的GAN整合了进去。也就是原作empty2windows_f009v2_400这个预训练的模型。

环境：

Houdini 16.5.634

Pytorch 0.4.0

Opencv-python 3.2   ->4.0会导致houdini闪退

安装就不再赘述，请见上一篇

1. 后端改造

把原作的bikegan封装为houdini可用的函数。

原作的test_interactive.py是主入口，做的事情是部署了多个监控进程，每个GAN如果有输入的话，就立即执行那个GAN。

我们要找的是

Interactive("facade labels", "empty2windows_f009v2_400",

            dataset_mode='multi', fit_boxes=(blank_classes, fit_blank_labels),

            empty_condition=True, metrics_condition=True, imgpos_condition=True,

            metrics_mask_color=[0, 0, 255])

这个进程。

看一下代码，初始化载入模型，然后开一个进程等待输入，有输入了就运行模型，执行RunG这个函数

facade2label会监测input/facade labels/val这个文件夹，会不会出现一个叫“go"的文件，有了就执行。

            go = os.path.abspath(os.path.join (event.src_path, os.pardir, "go"))

            if not os.path.isfile(go):

                return

运行模型的函数很简单，可以简化成

            data_loader = CreateDataLoader(self.opt)

            dataset = data_loader.load_data()

            for i, data in enumerate(dataset):

                self.model.set_input(data)

                _, real_A, fake_B, real_B, _ = self.model.test_simple(z, encode_real_B=False)

从目录文件夹载入图片，然后逐一喂给模型。

这就很简单了，我们知道Houdini Chop可以把图片转化为numpy的ndarray，那我们只需封装一下facade2label，让它输入一个ndarray，也输出ndarray。

择一下原作的代码稍加改动就行。

需要注意的是，原作data.compute_metrics中有一个compute_metrics函数，计算上文提到的里面距离信息。它会输入一个尺度参数，原作代码中通过文件名的@后面的数据读出，详见multi_dataset.py

if '@' in os.path.basename(os.path.splitext(self.AB_paths[index])[0]):

                unit_size = float(os.path.basename(os.path.splitext(self.AB_paths[index])[0]).split('@')[1].split('_')[0]) # in fraction of the image height

                unit_size *= metrics_mask.shape[0] # in pixels

else:

                unit_size = metrics_mask.shape[0]

这个参数我们是需要的，让houdini提供给pytorch后端

最后我们把它封装成facade2label函数，测试代码

if __name__ == '__main__':

AB = Image.open("facade0.png").convert('RGB')

AB = AB.resize((256,256), Image.BICUBIC)

imgarray = np.array(AB, dtype=np.float32)

imgarray /= 255.0

result = facade2label(imgarray, 0.2)

save_image(result, "output.png")

terminal运行能生成结果就是完成了。

2. CHOP编写

首先，要从上文写好的facade2label.py路径启动houdini，这样好导入这个库。

建一个operator，选python，类型是composite filter

![5987914522b531bbd82c9d2407b0400e.png](/images/5987914522b531bbd82c9d2407b0400e.jpg)

代码里只需要重写一些Cook函数就行

from facade2label import facade2label

    

def cook(cop_node, plane, resolution):

        input_cop = cop_node.inputs()[0]

        pixels = np.array(input_cop.allPixels("C"),dtype=np.float32)

        result = np.reshape(pixels, (256,256,3))

        

        input_geo_node = hou.node("../input_geo")

        inputgeo = hou.node(input_cop.parm("soppath").eval())

        maxsize = inputgeo.geometry().findGlobalAttrib("maxaxis").defaultValue()

        

        result = facade2label(result, 3 / maxsize)

        arraypxs = array.array("f", result.flatten())

        

        cop_node.setPixelsOfCookingPlane(arraypxs)

这里因为chop的上一个节点是Geometry节点，所以直接去找输入的一个参数就能找到那个sop

![b69fd6aa2fd7b4ef17e3bb2eb6798085.png](/images/b69fd6aa2fd7b4ef17e3bb2eb6798085.jpg)

其实核心就是这样。

之后做的无非就是一些收尾，比如把这个颜色映射到面片的頂点色上，窗户抠出来正则化

![b599d8f269f1e0f5863a5044ca1c81bc.png](/images/b599d8f269f1e0f5863a5044ca1c81bc.jpg)

![78c10c93e5195c70b164c52a2b9eeb3c.png](/images/78c10c93e5195c70b164c52a2b9eeb3c.jpg)

好咯基本就是这样，笔者找了一块地，下载OSM，用它的地块试了一下。

立面凑活能看吧。

![39250ff0ad3b6a2f018891cbd293f911.png](/images/39250ff0ad3b6a2f018891cbd293f911.jpg)
