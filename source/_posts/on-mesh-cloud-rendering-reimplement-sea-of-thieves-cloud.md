---
title: On Mesh Cloud Rendering – Reimplement Sea of Thieves’ cloud | 模型云渲染-重现盗贼之海的云
date: 2019-06-30 00:00:00
---
# 20190630 On Mesh Cloud Rendering - Reimplement Sea of Thieves' cloud

Sea of Thieves中提到了他们的云的渲染方法，非常的trick和cheap，对云的渲染模型做了相当大的简化，然后却还有不错的效果。笔者这里尝试重现Sea of Thieves中云的做法。原作在视频中给出了很多细节原理，笔者这里给出一点补充。

首先我们回顾一下体渲染的公式

![14cf7d6ced9f7f1e432fa059355c838c.png](image/14cf7d6ced9f7f1e432fa059355c838c.png)

![Image.png](image/Image.png)

这个式子有两项，

p点是视线上第一个不透明物体，c是相机，v是视线

前面一项是p点到c点的透射度\(Transmittance\) 乘以 p点的颜色

后面一项是一个视线路径的积分，路径上每一点\(c\-vt\)到c点的投射度 乘以 这个点的散射光\(scatter\) 乘以 体积的散射颜色\(scatter coefficient\)

其中透射项与灭绝系数（Extinction coefficient）,以及路径的长度有关，这个叫Lambert\-Beer定律

![d85a13667ce7a66cfbfad942e33b9d27.png](image/d85a13667ce7a66cfbfad942e33b9d27.png)

第二项里的散射光

![Image-1.png](image/Image-1.png)

P是光照在散射环境下的相函数，Rayleigh/Mie散射讲的就是这个。

V是光照的可见度，实际上有两项，一项是不透明物体阴影产生的，一项是自阴影，也就是当前点到光源的透射度。

c项时光源在当前点的强度。

由此，云的RayMarching计算基本可以理解了，需要raymarching两次。

raymarching一次视线方向，计算视线上每一个点的光照贡献

raymarching一次到光源，这对于视线上每一个点都需要计算。

因此这是个O\(n2\)复杂度的raymarching。

当然有很多方法简化这个O\(n2\)的raymarching，RTR4的14.4.2章讲到了众多可能。

比如用volume particle, 组合一堆球形billboard

比如用mesh\+hypertexture，预计算一张hypertexture帮助计算mesh表面的光照传递

比如直接就用raymarching体素，像Decima的方法。其中第二次raymarching，从视线点到光源的透射可以有多种方法简化，

Sea of Thieves首先把第一项，背景颜色项简化了。只用一个透明度混合背景颜色，而透明度是用高斯模糊做出来的。

然后对第二项两次raymarching计算，

首先忽略掉视线上的raymarching，只计算最表层一个点。

然后对于从表层点到光源的raymarching计算，把云的体积简化成了一个lobe，只有一个方向\(叫occlusion, float3\)和一个长度\(叫density吧, float\)的参数。

预计算时，首先从每个顶点做整个球面方向的随机射线，按在模型内部移动的距离加权平均求出平均的射线方向，然后求出射线方向的最大距离。

![46eb6670909ca912fdb9c6ecff9450b8.png](image/46eb6670909ca912fdb9c6ecff9450b8.png)

VEX：

```
int numray = 100;
int numstep = 100;
int step_length = 10;

vector rays[] = {};

float density = 0;
float travelDist = 0;

for(int rayid = 0; rayid < numray; rayid++){
    
    vector randomu = random(@ptnum*rayid);
    vector rayDir = sample_sphere_uniform(randomu);
    
    density = 0;
    travelDist = 0;
    for(int step = 0; step < numstep;step++){
        float exponent = 1.0 / numstep;
        float stepDist = step_length * exponent;
        travelDist += stepDist;
        
        vector newpos = @P + travelDist * rayDir;
        float sdf = volumesample(1, 0, newpos);
        
        if(sdf<0){
            density += stepDist;
        }
    }
    
    if(density >0){
        append(rays, rayDir * density * density);
    }
}

v@meanray = normalize(sum(rays)/numray);

density = 0;
travelDist = 0;
for(int step = 0; step < numstep;step++){
        float exponent = 1.0 / numstep;
        float stepDist = step_length * exponent;
        travelDist += stepDist;
        
        vector newpos = @P + travelDist * v@meanray;
        float sdf = volumesample(1, 0, newpos);
        
        if(sdf<0){
            density += stepDist;
        }
}

f@densityAlongMean = density;
```

在做光照计算时：

```
float NdOc= dot(normal, occlusion);
float distance = (pow(NdOc/2+0.5, 3) * density- 0.01);
```

![e460530e875a8c056fc29da110b246b8.png](image/e460530e875a8c056fc29da110b246b8.png)

如上图，椭球是某个点lobe，虚线是云的形状

于是，这就对任意方向的光源都能计算遮挡距离了，然后根据Beer\-Lambert定律就能算出透射度。

```
float transmittance = exp(-distance*extinct);
```

基本它云的光照模型就是这个原理。存的数值很少，就只有4个float，放uv上就行。另外假定这几个数值频率比较低，shading直接放顶点上做就好了，pixel shader只输出顶点插值结果就行。

这里我们可以拓展一下，如果不用一个lobe，而用球谐的方式，或者球谐三维点阵的方式，可以表示近似处云内部所有位置的遮挡项？那也是raymarching一次就好了。

![4581a8f18e60d343621ad85e70abafcc.png](image/4581a8f18e60d343621ad85e70abafcc.png)

在houdini里可以做一个快速的验证：

左：体素化后用cloudlight节点渲染，左中：pervertex的两次raymarching ground truth, 中：我们的模拟的结果，中右:Lambert，右：拟合混合lambert

看上去还是有点差距，不过比lambert强多了！

在unity中，顶点光照计算完以后，在屏幕空间进行一些处理，包括模糊，噪声处理等。这里原作参考了Volumetric Clouds and Mega\-Particles这篇文章，类似前文讲到的volume particle的做法。

顶点会把主光照和天光的transmittance存在RG两个通道，最终合成时再用光线颜色解出来。透明度存在B通道，为了最后与背景合成。当然顶点光照时还是0/1值，后面做模糊。A通道存深度信息，用于后面合成。

顶点光照后做一次高斯模糊，两个pass，一横一竖。这里注意的是，模糊的方差是根据深度做调整的。

高斯函数exp\(\-x^2/2\*s^2\)中有sigma项，单个pass中，旁边像素的权重其实是x=0，1，2时高斯函数的值，当然要做一次归一化。

```
half4 color = tex2D(_SourceTex, i.uv);
float deviation = lerp(10.0f,0.1f, color.w);
float minusHalfDeviSqr = rcp(-0.5f * deviation * deviation);

float factor1 = exp(minusHalfDeviSqr);
float factor2 = exp(minusHalfDeviSqr * 4);
float factor3 = exp(minusHalfDeviSqr * 9);
float factorAll = (((1.0f + 2.0f * factor1) + 2.0f * factor2) + 2.0f * factor3);

color += factor1 * tex2D(_SourceTex, i.uv01.xy);
color += factor1 * tex2D(_SourceTex, i.uv01.zw);
color += factor2 * tex2D(_SourceTex, i.uv23.xy);
color += factor2 * tex2D(_SourceTex, i.uv23.zw);
color += factor3 * tex2D(_SourceTex, i.uv45.xy);
color += factor3 * tex2D(_SourceTex, i.uv45.zw);

color *= rcp(factorAll);
```

这样按远处的轮廓会清晰一些。

![35c2564feb52915ee6ddd738466622c7.png](image/35c2564feb52915ee6ddd738466622c7.png)

之后对深度做一次boxblur，然后用噪波进行变形

![4f4e05f8ca7d153d456debdb7dc88782.png](image/4f4e05f8ca7d153d456debdb7dc88782.png)

噪波也是按深度进行混合，用这个噪波笔者做了flowmap混合，原作说做swirl，不太清楚是怎么做的

![Image-2.png](image/Image-2.png)

```
buf = new CommandBuffer();
buf.name = "CloudPass";

var cloudTargetID = Shader.PropertyToID("_TempCloudTarget");
buf.GetTemporaryRT(cloudTargetID, -2, -2, 16, FilterMode.Bilinear, RenderTextureFormat.ARGBHalf);
buf.SetRenderTarget(cloudTargetID, cloudTargetID);
buf.ClearRenderTarget(true, true, Color.black);
for (int i = 0; i < clouds.Count; i++)
{
    if(_cloudVisible[i])
        buf.DrawRenderer(clouds[i], _cloudMaterial);
}
int cloudDownsample1 = Shader.PropertyToID("_cloudDownsample1");
buf.GetTemporaryRT(cloudDownsample1, -4, -4, 0, FilterMode.Bilinear, RenderTextureFormat.ARGBHalf);
int cloudDownsample2 = Shader.PropertyToID("_cloudDownsample2");
buf.GetTemporaryRT(cloudDownsample2, -4, -4, 0, FilterMode.Bilinear, RenderTextureFormat.ARGBHalf);

//Downsample from 2x to 4x
buf.Blit(cloudTargetID, cloudDownsample1);

//GaussianBlurPass1
buf.SetGlobalTexture("_SourceTex", cloudDownsample1);
buf.SetGlobalVector("offsets", new Vector4(4.0f / Screen.width, 0, 0, 0));
buf.Blit(cloudDownsample1, cloudDownsample2, _postProcessingMaterial, 2);

//GaussianBlurPass2
buf.SetGlobalTexture("_SourceTex", cloudDownsample2);
buf.SetGlobalVector("offsets", new Vector4(0, 4.0f / Screen.height, 0, 0));
buf.Blit(cloudDownsample2, cloudDownsample1, _postProcessingMaterial, 2);

//BoxBlurDepth
buf.SetGlobalTexture("_CloudTarget", cloudDownsample1);
buf.SetGlobalVector("_CloudTarget_TexelSize", new Vector4(4.0f / Screen.width, 4.0f / Screen.height, 0, 0));
buf.Blit(cloudDownsample1, cloudDownsample2, _postProcessingMaterial, 0);

//NoiseDistort
_postProcessingMaterial.SetFloat("_WrapTile", SwirlTileSize);
_postProcessingMaterial.SetFloat("_SwirlStrength", SwirlStength);
_postProcessingMaterial.SetFloat("_SwirlSpeed", SwirlSpeed);
buf.SetGlobalTexture("_SourceTex", cloudDownsample2);
buf.Blit(cloudDownsample2, cloudDownsample1, _postProcessingMaterial, 3);

buf.ReleaseTemporaryRT(cloudTargetID);
buf.ReleaseTemporaryRT(cloudDownsample2);

buf.SetGlobalTexture("_CloudBlured", cloudDownsample1);

cam.AddCommandBuffer(CameraEvent.BeforeForwardOpaque, buf);
```

最后一步混合到背景里

```
//Blend With Sky
buf_after = new CommandBuffer();
buf_after.name = "CompositeCloud";
buf_after.SetGlobalTexture("_Background", BuiltinRenderTextureType.CurrentActive);
buf_after.Blit(BuiltinRenderTextureType.CurrentActive, BuiltinRenderTextureType.CameraTarget, _postProcessingMaterial, 1);

cam.AddCommandBuffer(CameraEvent.AfterForwardAlpha, buf_after);
```

最后补充一下云的做法，因为可以用模型云，美术可以就直接可以雕刻形状了，就像光遇中的云。不过笔者这里用了另一种方法，

用l\-system分布球。转成vdb再转成mesh

![02f41bb435745fdbb3332703304b707b.png](image/02f41bb435745fdbb3332703304b707b.png)

![image_0000.jpg](image/image_0000.jpg)
