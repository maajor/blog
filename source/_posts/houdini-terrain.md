---
title: Houdini Terrain | Houdini 地形生成
date: 2017-01-25 00:00:00
tags:
  - Houdini
  - Technical
  - Procedural Generation
  - Game Development
  - Terrain
---

讲道理呢，World Machine的地形用Houdini都是可以做出来的。不过还是有些局限，尝试了一下。

# 1. 噪声地形

主要就是两类：Voronoi 和 Perlin

Voronoi很简单，VOP里面直接就有Voronoi Noise

![9cb3367fe1094cf5d8d74f7ea47b7316.png](/images/9cb3367fe1094cf5d8d74f7ea47b7316.jpg)

出来和World Machine的很像。

![22738cf54c5ca4984ff29f7a818d44f2.png](/images/22738cf54c5ca4984ff29f7a818d44f2.jpg)

Perlin可以用Vop 里面的aanoise，不过这里选择了用wrangler写VEX。思路就是很多不同频率的aanoise叠加起来，傅里叶变换嘛。

![f3b5b94a456e1f9b63dd48fa29fb74c2.png](/images/f3b5b94a456e1f9b63dd48fa29fb74c2.jpg)

代码是：
```
float turb(vector sample_point;
           float  roughness;
           float  lacunarity;
           int    octaves;)
{
    float  sum    = 0;
    float  weight = 1.0;
    vector samp_p = sample_point;
    for (int i=0; i<octaves+1; i++) {
        // vector noise -0.5 to 0.5 range
        sum += (noise(samp_p) - 0.5) * weight;
        // next octave will be scaled in size
        samp_p *= lacunarity;
        // and reduced in contribution
        weight *= roughness;
    }
    return sum;
}

//ref parameters
vector offset = {0,0,0};
float scale = chf("scale");
float lacunarity = chf("lacunarity");
float roughness = chf("roughness");
float height_scale = chf("height_scale");
int octaves = 8;
vector sp = @P * scale + offset;
float cal = turb(sp, roughness, lacunarity, octaves) * height_scale;
@P.y += cal;
@height = @P.y;
```

频率每次乘lacunarity，强度每次乘roughness。

出来效果

![ba16419b87e467f077708e1f174eec29.png](/images/ba16419b87e467f077708e1f174eec29.jpg)

perlin 和 voronoi叠加就基本可以得到目标地形的原型了。

# 2. 变形

World Machine里很多节点，其实用Houdini 一个Ramp Chanel就解决了，比较像GH的Graph Mapper，不过更自由。

![808eaf13c22145c29f33611576cc154e.png](/images/808eaf13c22145c29f33611576cc154e.jpg)

效果：

![ab3d4c831d260aef3b0d47cc6567236b.png](/images/ab3d4c831d260aef3b0d47cc6567236b.jpg)

代码也很简单：

之前先promote到detail里了两个参数，高度最大最小值。
```
float h = f@height;
float toramp = fit(h, detail(0, "height_min"), detail(0, "height_max"), 0, 1);
float remap = chramp("ramp_height", toramp);
float mapback = fit(remap, 0, 1, detail(0, "height_min"), detail(0, "height_max"));
f@height = mapback;
v@P.y = mapback;
```
到此，基本意味着World Machine在溶解之前的功能，用Houdini都可以代替。

# 3. 侵蚀

这部分就比较复杂了，World Machine提供了四种：Hydraulic, Thermal, Snow, Coastal Erosion.

主要试了下Hydraulic，有一些论文参考(Mei, 2007)(Jako, 2011)

Mei Xing(梅星)这篇比较好懂。

插一句，查了下梅星是在中科院自动化所拿的博士，然后在三星研究院工作两年，中科院自动化所当了几年助理教授，现在在Snapchat工作。

![c562c2d4e108f5973d5a7ae333bb0039.png](/images/c562c2d4e108f5973d5a7ae333bb0039.jpg)

总共有五个变量：地面高度b，水位高度d，沉积量s，水流量(vector4 f)，沉积移动速度v（相当于高度场梯度）

基本模型分为5步：

    1. 降水，增加水位高度

    2. 水流动，取决于附近总高度(b+d)，以差值计算水流量，以水流量计算速度。

    3. 沉积溶解，水流含沙量固定。如果当前含砂容量(capacity)比沉积量(s)大，那么水流溶解一部分土壤，沉积量(s)增加、高度(b)减少。

    4. 沉积移动，根据速度方向差值移动沉积量。

    5. 水(d)蒸发

![fabd30fe162e642099b789698b17724e.png](/images/fabd30fe162e642099b789698b17724e.jpg)

Houdini in VEX第八周课程讲的这个，我也强行重写了一遍代码，原作代码有个地方写错了，移动沉积时左右方向应该取v.z，而不是v.y. 另外原作每一步都要重新计算周边点序号，其实直接把周边点序号存一个vector4就成了，速度更快。

但是效果不是非常好。可能是因为分辨率低也可能是算法原因，沟壑都没有出来。

World Machine的作者并没有说过他用的什么算法，不过在WM论坛某个帖子里，他引用过(Jako, 2011)那篇论文。具体实现可能还是有不少差别的，Erosion那个节点有很多参数似乎没法用本文这个Hydraulic Erosion的算法解释。效果也有差异。WM作者也没有发过什么论文，就写出来WM了。

![0cc1666784f73d7ec2d494b97e916a7e.png](/images/0cc1666784f73d7ec2d494b97e916a7e.jpg)

另外用VEX还有速度问题。虽然是多线程作业，不过还是慢，因为没有用GPU。

有帖子说如果要用GPU意味着VEX大部分要重写。不如用Gas OpenCL的一个wrangler。

上面那篇(Jako, 2011)做了一个比较：

![9f00eebdcdb69d823a4b444606344077.png](/images/9f00eebdcdb69d823a4b444606344077.jpg)

基本还是合理的，我的电脑上跑1024的分辨率，每个循环大概500ms(8核 2.6GHz)。所以跟World Machine速度是没法比的。WM做一个1024*1024的erosion，普通的1-2s就跑完了。这里刚跑一个循环啊。

WM很快，难道用了GPU计算？作者似乎也没提过，只是猜测了。

# 4. 总结

用Houdini代替WorldMachine有几个优点：

1. 简化工具链
2. 制作地形自由度更强，各种参数都可以自己设定贴图指定。
3. asset更容易管理
4. 地形可以和其它场景一起生成。

但是也有一些问题：

1. 侵蚀算法还需要提升，可能有不少工作要做
2. VEX速度太慢，需要用GPU计算。
3. 其它侵蚀算法的引入。

# Reference

Fast Hydraulic Erosion Simulation and Visualization on GPU - Mei - 2007

Fast Hydraulic and Thermal Erosion on the GPU - Jako - 2011
