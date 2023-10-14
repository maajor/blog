---
title: Headless Substance | 无头Substance材质生成
date: 2021-03-31 00:00:00
---

Substance套件作为当下游戏美术资产制作中，贴图制作这一环节的主流工具是相当成功的。其优点

- 其一是方便美术在3D视角下绘制贴图，
- 其二是可以利用程序纹理加快贴图制作效率。

本文探讨的是Headless Substance，即无人工无GUI参与的Substance贴图生成流程。当然这在大多数情况下并无必要，主流的生产管线中给美术做好程序纹理和SP智能材质模板就行了，然而这种方式仍然是人力密集的，并不方便scale up。本文希望探讨的技术可能对于以下应用场景有所帮助

- 自动化批量处理贴图，比如转通道，转mask
- 给模型加贴图
    - 比如高模（美术制作或扫描）自动生成可用的游戏资产
    - 程序化资产直接生成可用的游戏资产
    - 传统管线中部分特殊mask的自动化生成
    - 甚至UGC的资产生成？

当然也需要向读者指出的是，以上每个情景都可能有很多种技术方案，笔者这里探讨的仅仅是其中一种

读者肯定想到的是substance automation toolkit，本文也基本上是采用这种方法，笔者做的更多的是一个pipeline集成的工作以及范例资产的创建。

一番调研以后（参见后文案例研究篇），发现其实有蛮多方案了，比如在houdini里调用SAT或者直接执行sbsar，有给sat写了个界面的，官方甚至还有sat的dockerfile范例

然而笔者不太满意，笔者希望substance可以作为一个微服务运行在集群上，客户端通过网络协议与之交互。

技术选型上，SAT运行在docker上是官方证实的，所以我们就用docker配环境好了。网络协议上，考虑到SAT处理贴图的时间可能比较久，持续几分钟甚至更长，我们尝试使用websocket协议来发送请求和接收服务器的返回结果。最后，SAT怎么来？

其实订阅一下就行，在substance官网上订阅一个pro/indie版本，就能看到SAT的下载链接。好在SAT本身是不需要license审查的。

1. 技术实现

1.1 Dockerfile

首先笔者假定读者有一定Docker的基础知识，这里就不介绍了。

为了让SAT可以运行，我们得装一些依赖包，比如libglu之类的图形库

官方的dockerfile里已经写好了 [https://github.com/AllegorithmicSAS/sat_batchtools_gpu_free/blob/master/Dockerfile](https://github.com/AllegorithmicSAS/sat_batchtools_gpu_free/blob/master/Dockerfile)

笔者写的有点类似

```
RUN apt-get install -y --fix-missing
    sudo 
    python3-pip 
    libglu1-mesa 
    libxrandr2 
    libsm6 
    xvfb 
    libfontconfig 
    libxkbcommon-x11-0
ENV DISPLAY=:1
```

这其中有一个奥妙是装了xvfb。要不然的话，sbsbaker需要去找framebuffer但是找不到，而xvfb提供了一个虚拟的framebuffer

参考[https://forum.qt.io/topic/120349/run-qt-gui-application-inside-docker/13](https://forum.qt.io/topic/120349/run-qt-gui-application-inside-docker/13)

因此docker启动时必须带一个命令，让xvfb创建一个虚拟屏幕

```
Xvfb :1 -screen 0 1024x768x16
```

1.2 SAT

参考官方文档[https://docs.substance3d.com/sat](https://docs.substance3d.com/sat)

其主要功能主要有两个

- sbsbaker，烘焙贴图，类似substance designer/painter里的贴图烘焙功能
- sbsrender，用sbsar节点图处理贴图

其他的感觉用处不大。

使用上有两种，一种是CLI命令行模式，可以将参数传入命令行执行。另一种是官方自带的Pysbs包，通过python调用。不过阅读源码发现其实也就是起了一个subprocess执行命令行调用。

具体使用方法这里就不细说了，直接参考官方文档就行。

值得注意的一点是，sbsbaker除了支持单个通道烘焙的函数调用（比如sbsbaker_position_from_mesh）外，还有一个sbsbaker_run的函数，可以一次烘焙很多贴图。它接受一个json配置文件。而这个json配置文件是可以从substance designer中导出的。笔者也用的是这个方式，运行时拼装一个json配置文件，然后运行sbsbaker_run

1.3 Server

这个服务有几个特点

- 客户端给出请求以后，服务器是可以多次推送回状态和消息的
- 上传和下载的数据量可能比较大，几十上百兆
- 连接比较长，服务器处理可能持续几分钟

这时相比于Restful HTTP，使用websocket可能是更好的选择，借用一张Azure的图比较它们的区别，

websocket相比于HTTP

- 连接可以比较久
- 双向互相传输数据
- 每次请求overhead比较少

比较适合这个场景，所以我们选择websocket作为通信协议。

[WebSocket support in Azure Application Gateway | Microsoft Docs](https://docs.microsoft.com/en-us/azure/application-gateway/application-gateway-websocket)

![667783a9eaa1986602aded1f509150cd.png](/images/667783a9eaa1986602aded1f509150cd.png)

题外话是通信协议的另一种选择是gRPC，不过依赖有点多而我们希望甚至DCC里也能调用，所以先算了。

这样带来的一个直接好处是，可以更好支持泛型，比如服务器可以先接受一个manifest再接受其他数据，task运行完以后，给客户端推送结果也可以是泛型的

```
await self.receive_manifest()

for item in self.manifest:
    item_data = await self.receive_data(item)
    if 'entry' in item_data:
        params['entries'].append(item_data['entry'])
    else:
        params['values'].append(item_data['value'])
```

写好以后就可以打包进docker，我们写一个docker-compose文件以后，build就变得很简单，直接

```
docker-compose build sat
```

就可以了，

然后通过以下命令启动这个微服务

```
docker-compose up sat
```

具体代码参考笔者Github代码库

[https://github.com/maajor/docker-sat](https://github.com/maajor/docker-sat)

1.4 Client

客户端需要一个websocket库，笔者这里使用的是websocket-client这个库，它还算简单，而且支持到python2.7

和服务器一样，由于接受参数比较自由，客户端方法的签名甚至可以使用**kwargs

```
def render(self, sbsar_path, **inputs):
    manifest = {
        "sbsar": {'path': sbsar_path}
    }
    for input_name in inputs:
        val = inputs[input_name]
        if os.path.exists(val):
            data = {"path":val}
        else:
            data = {"value":val}
        manifest[input_name] = data
```

这样sbsrender我们可以用一个函数来支持。

不过仍然有一点问题，在传输大文件时候仍然需要切块。否则传输的payload会爆。但用websocket的好处是切块也很方便

```
filesize = os.path.getsize(item_path)
part_count = math.ceil(filesize/self.BUFFER_SIZE)
websocket.send(str(part_count))
with open(item_path, "rb") as f:
    if filesize < self.BUFFER_SIZE:
        ws.send_binary(f.read())
    else:
        while True:
            bytes_read = f.read(self.BUFFER_SIZE)
            if not bytes_read:
                break
            ws.send_binary(bytes_read)
```

具体代码参考笔者Github  [https://github.com/maajor/docker-sat/blob/main/client/satclient.py](https://github.com/maajor/docker-sat/blob/main/client/satclient.py)

1. 实验

在Substance中做自动处理贴图的主要方式就是用position，normal，ao，curvature，id之类的图，来生成与创建mask，以及混合贴图。下面两个案例即是如此

这里尝试了一个voronoi车的建模，高模和低模是houdini中生成，贴图使用SAT自动处理。

不局限于程序化生成的模型，任何已有高模（手工雕刻，扫描），都可以用类似的方法处理使之成为游戏内资产。

![screenshot000.png](/images/screenshot000.png)

建模的部分不细说，主要参考Siggraph Asia2018上, Akira Saito的讲座Procedural Hard Surface Design

![f00e156aff29c8e556a2c16f300e3d1d.png](/images/f00e156aff29c8e556a2c16f300e3d1d.png)

具体步骤就跟Saito桑讲的一样，没有太多原理上复杂的东西。

![steps.png](/images/steps.png)

而后在贴图部分，需要烘焙AO， ID， Normal三张图，在SD中做处理，主要操作就是用ID混合一些材质，导出一个sbsar的文件

![5d9bc2548e126872858e1fbb08ec73c8.png](/images/5d9bc2548e126872858e1fbb08ec73c8.png)

在叠加上烘焙出来的法线，AO

![screenshot001.png](/images/screenshot001.png)

![screenshot002.png](/images/screenshot002.png)

用来生成贴图的只是一小段代码。这里高模低模是Houdini存储出来的。

```
import os, shutil
from satclient import SATClient

def main():
    client = SATClient('127.0.0.1:1028')

    for i in range(1, 9):
        low = os.path.join(str(i), "low_bake.fbx")
        high = os.path.join(str(i), "high.fbx")
        sbsar = "proc_car.sbsar"

        bake_outputs = client.bake(high, low, channels=['normal', 'ao', 'id'], size=1024)

        render_outputs = client.render(sbsar, input_ID=bake_outputs['id'], input_AO=bake_outputs['ao'], input_Normal=bake_outputs['normal'])
        for output in render_outputs:
            basename = os.path.basename(render_outputs[output])
            shutil.move(render_outputs[output], os.path.join(str(i), basename))

if __name__ == '__main__':
    main()
```

连接上本地docker中运行的SAT服务，上传模型和sbsar让它烘焙就行了

最后就是这一套车子

![screenshot000.png](/images/screenshot000.png)

1. 总结

本文探讨了一种使用Substance处理贴图的流程。在流程层面，substance是微服务化的。生产中可以怎么方便怎么来，比如集成到Houdini PDG，直接从引擎中调用等等。微服务化的主要好处是方便部署和扩容，可以上云。在制作层面，主要是利用ID/几何信息，使用程序化纹理生成mask的方式制作贴图，可以用在任意已经有高模的资产的情况下。一个案例是给houdini程序化模型上材质。

本文没有讨论模型资产的自动化流程，但案例中低模UV都是houdini自动生成的。实现上完全可以让houdini也无头化成为一个资产处理的微服务。

本文仅代表个人研究，自己编写的服务器和SAT使用过程中有一些bug，仅供探讨，在生产环境中使用出现问题笔者概不负责:)

附录：案例研究

sat_batchtools_gpu_free

官方的一个dockerfile，可以让SAT运行在linux docker image中，对本文相当有启发

不过readme中如果没有sat使用经验的话容易搞不懂它到底干了啥。

[AllegorithmicSAS/sat_batchtools_gpu_free: A Docker alternative to use batchtools without GPUs. (github.com)](https://github.com/AllegorithmicSAS/sat_batchtools_gpu_free)

笔者总结一下，它

1. 让sat可以运行在没有gpu的虚拟机上，这就为sat上云创造了可行性
2. 有一个CLI入口可以执行各种sat的功能

sat-scon

这个很有意思做了一个资产自动构建的项目，用sat生成缩略图，可以理解成一个buildmachine

[AllegorithmicSAS/sat-scons: A sample showing how using the Substance Automation Toolkit together with the scons build system to do incremental content builds. (github.com)](https://github.com/AllegorithmicSAS/sat-scons)

substance designer batch tool

读者如果看substance designer的安装目录下面有一个sbscooker，其实跟SAT的sbs cooker是一样的。只不过缺少sbsbaker

[Substance Designer: Batch Tools | jason brackman's (wordpress.com)](https://jasonbrackman.wordpress.com/2015/03/03/substance-designer-batch-tools/)

substance uber baker

[Substance Uber Baker (orbolt.com)](https://www.orbolt.com/asset/ophi::sbs_uber_baker::1.0)

其实就是在houdini里调用sat的一个接口节点

substance in houdini

sidefx官方gamedevelopmenttool的工具，在COP中可以调用sbsar文档来处理贴图

好像不依赖substance还不错，只不过有时候会崩溃

江流大佬做的是在houdini里面调用SAT的api

[https://zhuanlan.zhihu.com/p/107424364](https://zhuanlan.zhihu.com/p/107424364)

[HQueue + TOPs +Substance Automation Tool kitでテクスチャをベイクする！ – Born Digital サポート](https://support.borndigital.co.jp/hc/ja/articles/360000275482-HQueue-TOPs-Substance-Automation-Tool-kit%E3%81%A7%E3%83%86%E3%82%AF%E3%82%B9%E3%83%81%E3%83%A3%E3%82%92%E3%83%99%E3%82%A4%E3%82%AF%E3%81%99%E3%82%8B-)

用houdini的农场来调用SAT，蛮像影视工作室的方案，渲染农场可不是谁都有的

[Substance Automation Toolkitを利用してHDRP向けLOD0テクスチャをLOD1、LOD2に転写するツールを作成した | 測度ゼロの抹茶チョコ (matcha-choco010.net)](https://matcha-choco010.net/2020/01/17/hdrp-lod-texture-baker/)

基本是在讲怎么用SAT的API

[Substance Automation Toolkitによる簡単自動化 - もんしょの巣穴ブログ Ver2.0 (hatenablog.com)](http://monsho.hatenablog.com/entry/2019/03/07/170120)

![af84508553c056c4c996ff5633efc29b.png](/images/af84508553c056c4c996ff5633efc29b.png)

1 下载

[AllegorithmicSAS/sat_batchtools_gpu_free: A Docker alternative to use batchtools without GPUs. (github.com)](https://github.com/AllegorithmicSAS/sat_batchtools_gpu_free)

[AllegorithmicSAS/sat-scons: A sample showing how using the Substance Automation Toolkit together with the scons build system to do incremental content builds. (github.com)](https://github.com/AllegorithmicSAS/sat-scons)

[Substance Designer: Batch Tools | jason brackman's (wordpress.com)](https://jasonbrackman.wordpress.com/2015/03/03/substance-designer-batch-tools/)

houdini sbs baker

[Substance Uber Baker (orbolt.com)](https://www.orbolt.com/asset/ophi::sbs_uber_baker::1.0)

[HQueue + TOPs +Substance Automation Tool kitでテクスチャをベイクする！ – Born Digital サポート](https://support.borndigital.co.jp/hc/ja/articles/360000275482-HQueue-TOPs-Substance-Automation-Tool-kit%E3%81%A7%E3%83%86%E3%82%AF%E3%82%B9%E3%83%81%E3%83%A3%E3%82%92%E3%83%99%E3%82%A4%E3%82%AF%E3%81%99%E3%82%8B-)

[Substance Automation Toolkitを利用してHDRP向けLOD0テクスチャをLOD1、LOD2に転写するツールを作成した | 測度ゼロの抹茶チョコ (matcha-choco010.net)](https://matcha-choco010.net/2020/01/17/hdrp-lod-texture-baker/)

[Substance Automation Toolkitによる簡単自動化 - もんしょの巣穴ブログ Ver2.0 (hatenablog.com)](http://monsho.hatenablog.com/entry/2019/03/07/170120)

procedural pipeline framework? python pipeline nodes
