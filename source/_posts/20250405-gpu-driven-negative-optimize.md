---
title: 如何在移动端使用 GPU Driven “负”优化 | How to Achieve "Negative" Optimization with GPU Driven in Mobile Devices
date: 2025-04-05 00:00:00
---
# GPU Driven 的分级与定义

为了厘清 GPU Driven 相关概念，如同对自动驾驶、大语言模型（LLM AI）进行分级一样，我们在此斗胆对相关技术做一个分级。

- L1：利用 Indirect Draw 的 API 绘制实例，例如绘制草丛。
- L2：针对地形、植被、建筑等进行 GPU Driven。此级别需使用相同的网格（Mesh）进行实例化（Instancing），并运用 Indirect Draw。相较于 L1，增加了遮挡剔除功能以及一些更为复杂的数据组织方式（如针对地形的数据组织）。代表案例如 Terrain Rendering in FarCry 5
- L3：按 Cluster 来组织网格数据，执行遮挡剔除操作，运用 MultiDrawIndirect 来组织渲染，并通过 Bindless/VT 绑定贴图材质。与 L2 相比，新增了网格集群（Mesh Cluster）、MultiDraw 以及 Bindless 等技术。代表如 SIGGRAPH 2015 GPU Driven Rendering Pipelines
- L4：在 GPU 上进行细节层次（LOD）选择、遮挡剔除，采用软光栅以及基于可见性缓冲区（Visibility Buffer）的渲染方式。这是一种软件层面的 GPU Driven 终极方案。相比 L3，增添了软光栅和可见性缓冲区等功能。代表技术如虚幻引擎 5（UE5）中的 Nanite。
- L5：运用网格着色器（Mesh Shader），实现硬件层面的 GPU Driven。比 L4 多了硬件层面的支持。

总体而言，L1 和 L2 在移动端已被证实可行，然而 L3、L4 和 L5 目前在移动端还不太现实。

L3 在安卓平台上，基本没有对 Bindless/MultiDraw 的支持；L4 的工程难度极大，且在安卓平台上，计算着色器存在一些性能瓶颈；L5 需要特定版本的 DX12，在移动端更是无法实现。

值得庆幸的是，近年来移动端 GPU 一般都支持计算（Compute）和间接绘制（Indirect Draw），对 Vulkan 也有了一定支持。因此，我们可以尝试运用一些 GPU Driven 的技巧。

不过，移动端与桌面端的最大区别在于能耗。移动端 GPU 的功耗可能仅为几瓦，而桌面端可能高达几百瓦。所以，移动端存在一系列特殊的硬件优化措施和限制，这导致其图形渲染管线的最佳实践与桌面端可能有所不同。

笔者在此尝试的分级大致相当于 L2，但场景中没有实例化模型。相反，所有的网格（Mesh）都各不相同，并且这些网格都有可能动态破坏并重新生成。我们原本的优化目标是减少绘制调用（DrawCall），但最终结果却是负优化。以下通过硬件平台的特性，解释一下负优化的原因。

# GPU Driven 在移动端的限制

## 1. Vertex Shader

一般来说，在使用 IndirectDraw 时，我们会在顶点缓冲区（Vertex Buffer）中访问着色器存储缓冲区对象（SSBO），例如 Unity 官方的 RenderPrimitivesIndirect 示例。

```csharp
StructuredBuffer<int> _Triangles;
StructuredBuffer<float3> _Positions;
uniform uint _BaseVertexIndex;
uniform float4x4 _ObjectToWorld;

v2f vert(uint svVertexID: SV_VertexID, uint svInstanceID : SV_InstanceID)
{
    InitIndirectDrawArgs(0);
    v2f o;
    uint cmdID = GetCommandID(0);
    uint instanceID = GetIndirectInstanceID(svInstanceID);
    float3 pos = _Positions[_Triangles[GetIndirectVertexID(svVertexID)] + _BaseVertexIndex];
    float4 wpos = mul(_ObjectToWorld, float4(pos + float3(instanceID, cmdID, 0.0f), 1.0f));
    o.pos = mul(UNITY_MATRIX_VP, wpos);
    o.color = float4(cmdID & 1 ? 0.0f : 1.0f, cmdID & 1 ? 1.0f : 0.0f, instanceID / float(GetIndirectInstanceCount()), 0.0f);
    return o;
}
```

经实际测试发现，对于相同的网格（Mesh），直接使用 Mesh 渲染要比使用 IndirectDraw 渲染更快。

### 原因一：基于图块的渲染（Tile Based Rendering）/ 分块阶段（Binning Pass）的多次顶点着色器调用。

在高通 Adreno 的 Tile Based Rendering 架构下，硬件首先会执行一次 Binning Pass，预先判断哪些 Tile 会被哪些绘制调用（DrawCall）渲染到，这样在后续过程中，每个 Tile 内只会执行可见的 DrawCall。在这个阶段，会执行一个仅计算位置的顶点着色器（Position - Only Vertex Shader）来确定顶点位置。然而，在之后的着色阶段还会再次执行顶点着色器。由于顶点着色器（VS）被执行了两遍，导致顶点着色器的开销变得非常大。

### 原因二：缓冲区访存带宽。

我们援引 Adreno GPU on Mobile: Best Practice 中 [Buffer Best Practice](https://docs.qualcomm.com/bundle/publicresource/topics/80-78185-2/best_practices.html#buffer-best-practices) 一节：

> 
> 在可能的情况下，优先使用顶点缓冲区对象（VBO）。
> 
> 否则，优先使用统一缓冲区（UBO），前提是对于给定的着色器，其所有统一缓冲区的大小总和不超过 8K 的 90%，即 0.9×8192 = 7372 字节。请注意，图形 API（在 Vulkan 中为 vkPhysicalDeviceLimits::maxUniformBufferRange）所报告的最大大小只是一个正确性限制，而非性能限制。需注意，着色器使用的所有统一缓冲区的大小总和（并非单个统一缓冲区的大小）必须保持在这个限制以下，以避免可能出现的性能下降。
> 
> 对于较大的数据量，优先使用纹理，而非着色器存储缓冲区对象（SSBO）。
> 
> 如果一个统一缓冲区（UBO）超过了其最佳大小，编译器将尝试确定着色器可能访问该统一缓冲区的哪些部分，并仅将这些部分映射到常量随机存取存储器（RAM）中。动态或间接索引可能会妨碍这种优化，因此，如果你的统一缓冲区（UBO）可能超过其最佳大小（并且你选择不使用纹理或着色器存储缓冲区对象（SSBO）），则优先使用静态索引。

顶点缓冲区访问 SSBO 存在性能限制，过大的 SSBO 所导致的性能下降更为显著。甚至，访问纹理（Texture）在性能上都优先于访问 SSBO。另外，统一缓冲区对象（UBO）也存在大小限制。

因此，在移动端的 GPU Driven 渲染中，顶点着色器访问 SSBO 的这种做法实际上是一种负优化。

## 2. Compute 合并 Mesh

那么，是否有可能直接在计算着色器（Compute Shader）中把数据写入顶点缓冲对象（VBO），通过合并网格（Mesh）来达到减少绘制调用（DrawCall）的目的呢？

实际上是可行的，Unity 提供了相应的方法。

```csharp
// In C# Script
mesh.vertexBufferTarget |= GraphicsBuffer.Target.Raw;
computeShader.SetBuffer(0, "MeshVertexBuffer", mesh.GetVertexBuffer(0));

// In Compute Shader
RWByteAddressBuffer MeshVertexBuffer;
RWStructuredBuffer<uint> Counter;
StructuredBuffer<float3> Position;

[numthreads(32,1,1)]
void Batch(uint3 id: SV_DispatchThreadID)
{
  uint targetId;
  // some culling...
  
  InterlockedAdd(Counter[0], 3, targetId);
  MeshVertexBuffer.Store3(targetId, asuint(Position[id.x]));
}
```

但这是负优化。我们解释一下为什么。

### 原因1： Compute Overhead

援引文档 [compute-shaders-performance-like-other-shaders](https://docs.qualcomm.com/bundle/publicresource/topics/80-78185-2/best_practices.html#compute-shaders-performance-like-other-shaders)

> 在可能的情况下，优先使用片段着色器而非计算着色器，因为计算着色器要求在下一个内核开始执行之前，将当前内核的输出写入内存。相比之下，片段着色器使用了高通 Adreno 的并发解析硬件，该硬件能够在写入一个片段程序的结果的同时，允许另一个片段程序开始同步执行。  
> 
> 在 A7X GPU 上：
每当并发本地组的数量超过 64 的倍数时，就可能会对性能产生影响。如果着色器有相当长的时间处于停滞状态，那么每当并发本地组的数量达到 128 的倍数时，都可能会出现性能影响。
当并发本地组的数量超过 2048 的倍数时，还存在另一种可能的性能影响。
> 
> 在 A7X GPU 上，每当工作组的数量超过 16 的倍数时，就可能会对性能产生影响。如果着色器相互读取彼此的内存，那么这个倍数则变为 8。


具体来说，计算着色器的调用是存在开销的。由于它只能依次进行调用，因此延迟（Latency）无法通过并发性（Concurrency）来掩盖。与之相反，片段着色器（Fragment Shader）可以并行执行，从而能够掩盖延迟。

同时，计算着色器的线程组数量不能设置得过高，否则会对性能产生较大影响。

所以，在高通设备上，计算着色器虽然可以使用，但使用范围较为有限。

### 原因二：带宽问题

当我们使用计算着色器来合并网格时，需要额外对缓冲区（Buffer）进行两次读写操作：一次读取着色器存储缓冲对象（SSBO），一次写入顶点缓冲对象（VBO）。并且在后续渲染过程中还需要再读取一次 VBO。这就意味着带宽的使用量变为原来的三倍…… 因此，这无疑还是一种负优化。

此外，如果合并后的 VBO 数据量过大，同样会引发带宽瓶颈，进而导致极高的顶点获取停顿（Vertex Fetch Stall）数值。

## 3. HZB 遮挡剔除

在一般的 GPU 驱动（GPU Driven）过程中，通常会生成一次层次 Z 缓冲区（Hierarchy Z Buffer，HZB），用于模型的遮挡剔除。这在 PC 端非常有用。

在 Unity 6 的 Resident Drawer 中，也提供了 GPU 遮挡剔除（GPU Occlusion Culling）选项，其本质就是基于 HZB 的剔除。

然而，在移动端，这一功能有时反而会成为负优化。原因如下：

### 原因1： LRZ 等功能

如 [LRZ 文档](https://docs.qualcomm.com/bundle/publicresource/topics/80-78185-2/overview.html#lrz,-early-z-and-fast-z) 描述

> 这项功能减少了内存访问量和渲染的基元数量，降低了应用程序从前向后绘制的必要性，因而通常能提高帧率。


低分辨率 Z 通道（Low Resolution Z pass，LRZ）是高通 Adreno 硬件自带的功能，无法通过 API 进行开启或关闭操作。该通道在分块通道（Binning Pass）过程中执行，之后在渲染通道（Rendering Pass）中剔除不符合条件的像素片段。由于硬件已经执行了部分剔除工作，从软件层面再进行一些类似的剔除操作就显得多余了。

### 原因2：Resolve

若要获取深度信息，必须勾选 URP 中的 “Depth Texture” 选项。这一操作意味着需要额外进行一次 Blit 操作。如果之前没有任何 Blit 操作，这将破坏原本直接渲染到后台缓冲区（Backbuffer）的路径，需要将所有 Tile 的数据解析（Resolve）到显存（VRAM）中，极大地增加了带宽需求。

### 原因3：剔除百分比

在开放世界游戏中，第一人称视角下可能存在大量物体遮挡的情况，遮挡剔除能够显著减少需要渲染的三角面数量。但在顶视角游戏中，可被遮挡剔除的三角面数量可能相对较少。因此能否优化，与游戏类型直接相关。

因此，在移动端，HZB 有时会成为负优化。不过，如果能在 CPU 端直接进行剔除操作，减少提交到 GPU 的绘制调用（DrawCall）数量，则可能仍是正向优化。这就是为什么在一些移动端项目中，开发者会选择使用软光栅剔除的原因。

# 总结

在移动端进行优化，了解硬件特性至关重要。尽管我们无法改变硬件的实现方式，但清楚这些特性能够避免在优化过程中走弯路。

当然，若不亲自尝试一次负优化，往往难以对相关知识有更为深刻的认识。总的来说，笔者始终认为实践出真知。面对硬件实现这个黑盒，进行基准测试（Benchmark）和性能分析（Profile）会带来更大的收获。

众所周知，Unity 6 的 Resident Drawer 实现了 GPU Driven 渲染。但实际上，其主要是本文开头所提及的 L2 级别的 GPU 驱动，即针对大量实例化（Instancing）的情况，并不包含对模型网格集群（Cluster）等的处理。究其原因，恐怕与本文所尝试的负优化有关：在移动端，可能只有针对实例化的 GPU 驱动才是正优化，其他方式大概率都是负优化。

对于 Unity 而言，其主要目标是适配多平台，而非专注于高端平台。因此，它不会提供激进的Bindless、GPU Driven、Virtual Texture 等原生组件，而只会提供一个适用于大多数平台的通用功能。至于针对特定平台的优化，就需要开发者各显神通了。

# 参考资料

[Adreno GPU on Mobile: Best Practices](https://docs.qualcomm.com/bundle/publicresource/topics/80-78185-2/best_practices.html)

[GPU 性能迷思 - 知乎](https://zhuanlan.zhihu.com/p/2759747438)