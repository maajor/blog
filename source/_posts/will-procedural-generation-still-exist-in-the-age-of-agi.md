---
title: Will procedural generation still exist in the age of AGI? | AI时代程序化生成还会存在吗？
date: 2023-05-13 00:00:00
---

# 1. 背景

ChatGPT, MidJourney, StableDiffusion已经证明了它们具有强大的AGI能力，但它仍然存在着局限。

ChatGPT深陷数据隐私的问题，三星不允许员工使用便是一例。但更深层次的，围栏是人类的本性，有人的地方就有圈子，在垂直细分领域，将大模型专精化，便有其革命之地。

限制大模型训练的一是训练数据，二是硬件需求。StableDiffusion基于LAION数据集训练，它有50亿个样本，需要几百台A100训练几周，一般人承受不起。就算小一点的ControlNet，基于合成的数据集，训练量级也在100万样本，100GPU小时（A100）。这都不是一般人玩得起的。

但好在pretrained+finetune在很多时候效果已经足够好，也就可以成为垂直领域的应用逻辑。它意味着小样本，小计算量就能得到一个不错的模型，影响的因素只有训练的数据了，谁的数据集好，谁就强。正如前文说的，垂直领域的数据并不是能公开获取到的，甚至是个人/企业/团体/机构私有的。于是用私有数据训练的AI就会成为垂直领域能力的放大器，甚至形成数据飞轮垄断市场。

笔者想探讨的是，垂直领域自用数据训练的效果能有多好？尽管Civit.ai上已经有很多模型，但还更多在绘画圈，并不能普适用于所有2D影像的生产。

游戏行业有一类特殊的图片是贴图，它有较为特别的要求：basecolor不包含光影信息，法线是特殊encode的信息，并非一般图片生成软件都能生成。传统的做法是使用Substance Designer等程序化贴图软件生成这类贴图（风格化+写实类），或者手绘，或者用照片生成（Photogrammy）。同样是2D图片，它能不能用Stable Diffusion之类模型生成？

当然可以，比如withpoly.com, barium.ai, dreamtexture等。但笔者想探讨的是能不能自己的pretrain+finetune？

# 2. 工具技术

Stable Diffusion笔者就不再赘述了，

为了降低训练成本，笔者直接使用LoRA技术finetune Stable Diffusion模型。笔者了解到一般训练方法有三种

- khoya‘s https://github.com/kohya-ss/sd-scripts, 一套封装好的训练脚本
- diffuser，huggingface官方的一套工具包
- stable diffusion web ui + dreambooth extension，普及度最广的一个私炉方案。

khoya笔者没有尝试。

## 2.1 Diffuser

api简洁，pip install一个包就都够了，训练脚本直接可以用示例的

```csharp
accelerate launch --mixed_precision="bf16"  train_text_to_image_lora.py \
  --pretrained_model_name_or_path="runwayml/stable-diffusion-v1-5"  \
  --dataset_name=maajor/stylized-texture \
  --dataloader_num_workers=8 \
  --resolution=512 --center_crop --random_flip \
  --train_batch_size=4 \
  --gradient_accumulation_steps=4 \
  --max_train_steps=2000 \
  --learning_rate=1e-04 \
  --max_grad_norm=1 \
  --lr_scheduler="cosine" --lr_warmup_steps=0 \
  --output_dir="/root/autodl-tmp/mydiffuser/stylized-texture-lora" \
  --checkpointing_steps=100 \
  --validation_prompt="A stylized texture of stone cliff" \
  --seed=1337 \
  --logging_dir="/root/tf-logs" \
  --validation_epochs=5
```

（插一句train_text_to_image_lora.py有两个缺陷：

1. checkpoint只输出了accelerator的state数据，没有输出stable diffusion pipeline的lora数据，没法直接载入某个checkpoint。
2. lora模型默认rank=4，比较小；相比之下stable diffusion web ui一般大家建议用32。构造的时候自己写死就行了

不过稍显麻烦但是也有价值的是需要整理自己的dataset，使用huggingface的datasets，几行代码就可以创建一个数据集。[Create a dataset (huggingface.co)](https://huggingface.co/docs/datasets/create_dataset)

```csharp
```csharp
不过稍显麻烦但是也有价值的是需要整理自己的dataset，然后可以分享在huggingface网页上，参考官方文档。
```
```

这样很符合程序员的逻辑，方便以后复现。并且方便部署。

但笔者感觉主要问题是其训练效果和stable diffusion不太一致，

尽管效果凑活，下图：

prompt： A stylized texture of stone cliff, weathered, sharp, dry climate

从左到右：lora权重 0 ~ 1

![Untitled](/images/Untitled_12.jpg)

inference的代码也很简单

```csharp
from diffusers import StableDiffusionPipeline

pipe = StableDiffusionPipeline.from_pretrained("runwayml/stable-diffusion-v1-5", torch_dtype=torch.float16, safety_checker=None)

lora_dir = "<dir>"
pipe.unet.load_attn_procs(lora_model)
pipe.to("cuda")

prompt = "A stylized texture of stone cliff, weathered, sharp, dry climate"
image = pipe(prompt, num_inference_steps=30, guidance_scale=7.5, cross_attention_kwargs={"scale": 1.0}).images[0]
image.save("image.jpg")
```

但使用起来终归没有web ui方便，笔者仅仅做了尝试。

## 2.2 Stable Diffusion Web UI

大家最常见的私炉了，笔者使用的AutoDL上的机器和第三方镜像，安装过程不过多赘述，

主要就是用了 https://github.com/d8ahazard/sd_dreambooth_extension 这个插件来做lora训练，训练过程也不多赘述，bilibili/youtube有很多视频，

总之就是比较方便测试使用。

2.3 Substance Designer

训练集大多是Substance Designer生成的，

注意现在Substance Designer一般安装自带一个sbsrender CLI工具，也就不用substance automation toolkit之类了；类似这样一个脚本就能让sbsrender基于一个sbsar生成特定参数特定大小的图片。

```python
cmds = [
  sbsrender,
  'render',
  '--input',
  sbsar_path,
  '--output-path',
  output_path,
  '--output-bit-depth',
  '8',
  '--output-name',
  outname,
  '--set-value',
  '$outputsize@9,9', # 512 * 512
  '--set-value',
  f'$randomseed@{randomseed}', # 512 * 512
  '--no-report',
  '--output-format',
  'jpg'
]
subprocess.run(cmds)
```

# 3. Case Study

所有测试基底模型都是stable diffusion v2 base 512，

## 3.1 Lace

### 训练集

一个花纹训练集，数据来自一个Substance Designer资产包，总共40套，笔者训练了diffuse

![Untitled](/images/Untitled_13.jpg)

Stable Diffusion Web UI Dreambooth extention的训练参数

- instance token: lace
- class token: diffusemap
- instance prompt: [filewords], symmetry, seamless pattern, best quality, 4k

另外每张图片的训练提示词通过BLIP生成后，手工标注了一些。

训练时间大概10分钟，

### 输出样本

lace pattern, crisp detailing, symmetry, seamless, best quality, 4k, tiger face pattern

![00055-1536793028.jpg](/images/00055-1536793028.jpg)

lace pattern, diffusemap, sunflower pattern, 4k, best quality, symmetry, seamless, lora:lace_diffuse_3200:1

![00546-3877955319.jpg](/images/00546-3877955319.jpg)

### 对比试验

同样的提示词：lace pattern, crisp detailing, symmetry, seamless, best quality, 4k, tiger face pattern

Lora权重的影响

![xyz_grid-0016-530555102.jpg](/images/xyz_grid-0016-530555102.jpg)

没有Lora生成的结果

![grid-0082.jpg](/images/grid-0082.jpg)

可以看出来基底模型的图案效果已经不错，但加上lora才有了训练集中纹理样式的感觉和密铺图案的样子。

## 3.2 Facade

### 训练集

同样来自一套Substance材质，总共16张

![Untitled](/images/Untitled_14.jpg)

训练参数：

- instance token: facade
- class token: texture
- instance prompt: [filewords], building, architecture, wall, facade, high quality, 4k,

另外每张图片的训练提示词通过BLIP生成后，手工标注了一些。

### 输出样本

chinese architecture, facade, palace, wood, high quality, 4k lora:facade_diffuse_10032:0.4

![00961-747507312.jpg](/images/00961-747507312.jpg)

neo-classic architecture, facade, modern, tokyo, stone material, glass, lora:facade_diffuse_10032:0.4

![00966-898465104.jpg](/images/00966-898465104.jpg)

modern architecture, facade, tokyo, kengu kuma, bamboo and steel, lora:facade_diffuse_10032:0.4

![00985-3164725962.jpg](/images/00985-3164725962.jpg)

### 对比试验

提示词：modern architecture, facade, stone material, high quality, 4k

没有Lora，注意到生成的大多不是正视图

![grid-0123.jpg](/images/grid-0123.jpg)

没有 lora，勾选了tiling，注意tiling没啥用

![grid-0124.jpg](/images/grid-0124.jpg)

Lora权重的影响，注意模型有些过拟合，权重0.4时候效果比较丰富而且是正投影，但是权重1.0就太像训练集了

![xyz_grid-0020-3475862496.jpg](/images/xyz_grid-0020-3475862496.jpg)

提示词：chinese architecture, facade, palace, wood, high quality, 4k

没有LoRA，注意到生成的大多不是正视图

![grid-0126.jpg](/images/grid-0126.jpg)

没有 LoRA，勾选了tiling，注意tiling没啥用

![grid-0125.jpg](/images/grid-0125.jpg)

LoRA权重的影响，注意模型有些过拟合，权重0.4时候效果比较丰富而且是正投影，但是权重1.0就太像训练集了

![xyz_grid-0021-3645138104.jpg](/images/xyz_grid-0021-3645138104.jpg)

## 3.3 Stylized Texture

### 训练集

同样来自一套Substance材质，总共90张

![Untitled](/images/Untitled_15.jpg)

训练参数：

- instance token: game-stylized
- class token: diffusemap
- instance prompt: [fileword], cartoon, stylized, flat texture

### 输出样本

A stylized texture of stone cliff, weathered, sharp, dry climate, game-stylized, diffusemap, lora:stylized_texture_7425:0.8

![00988-3029372254.jpg](/images/00988-3029372254.jpg)

A stylized texture of sandy land, sparsely growing grass, some small rock scattered on ground, weathered, game-stylized, diffusemap, lora:stylized_texture_7425:1.0

![01006-3134389596.jpg](/images/01006-3134389596.jpg)

A stylized texture of wooden panel, craked and weathered, game-stylized, diffusemap, lora:stylized_texture_7425:1.0

![01034-3936437691.jpg](/images/01034-3936437691.jpg)

### 对比试验

A stylized texture of stone cliff, weathered, sharp, dry climate, game-stylized, diffusemap, lora:stylized_texture_7425:1

训练Checkpoint的影响，注意并不是最后的结果是最好的，需要手动挑选checkpoint

![xyz_grid-0004-1503357831.jpg](/images/xyz_grid-0004-1503357831.jpg)

Lora权重的影响， 0.8 ~ 1.0还是不错的

![xyz_grid-0005-219816801.jpg](/images/xyz_grid-0005-219816801.jpg)

不带lora，但是tiling。注意到图案比较细碎

![tiling.grid.jpg](/images/tiling.grid.jpg)

A stylized texture of sandy land, sparsely growing grass, some small rock scattered on ground, weathered, game-stylized, diffusemap, lora:stylized_texture_7425:1.0

![xyz_grid-0015-2814874648.jpg](/images/xyz_grid-0015-2814874648.jpg)

no lora, 勾选了tiling，注意石子位置怪怪的，没有草。

![grid-0073.jpg](/images/grid-0073.jpg)

# 4. 总结

就训练过程和结果来看，笔者总结有如下两点

- finetune的过程loss会波动，并且对结果的评价标准也比较主观，因此需要手动选择checkpoint和权重才能达到比较好的结果。训练还是需要一些技巧，大模型也不是银弹。
- 训练集价值比较大，没有finetune的情况下，Stable Diffusion模型较难达到预期，对finetune来说数据集的意义飞涨重要。
- 使用finetune能比较接近地达到训练集的风格样式，尽管目前质量并不完美，但随着大模型技术的飞速发展，笔者相信终有一天机器学习模型能够生成贴图。

笔者猜想，或许未来的资产批量化生产都可以交给AI，人类专家只需要生产训练样本就可以了。传统技术精英和传统方法仍有其存在价值，数据的获取和生产会成为垂直领域的壁垒，ScaleUp完全来自于数据训练出的AI，人类就这样被AI剥夺着剩余价值。

所以程序化生成还会存在吗？

笔者认为还是会的，只不过它会变成一个存量市场，现有的人类专家仍有存在的意义，但是对于新人就不那么友好了。