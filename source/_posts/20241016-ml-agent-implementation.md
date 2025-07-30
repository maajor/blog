---
title: Unity ML Agent Implementation | Unity ML Agent 的实现
date: 2024-10-16 00:00:00
tags:
  - AI
  - Unity
  - Machine Learning
  - Technical
---

# 背景

选择和训练与角色动作相关的强化学习模型时，Unity ML Agent 是一种选择，专为通用游戏设计，如控制NPC行为，并能在Unity中直接训练和部署。本文不讨论ML Agent的使用教程，而更关注其架构实现及优劣势。

文档在 Github 上较为详细 

[https://github.com/Unity-Technologies/ml-agents/blob/develop/docs/ML-Agents-Overview.md](https://github.com/Unity-Technologies/ml-agents/blob/develop/docs/ML-Agents-Overview.md)

在官方上反而不太全。

# 总体概念

首先，我们需要回顾一下强化学习的基本概念，这对于理解ML Agent的实现至关重要。

![Untitled](/images/mlagent0.png)

在强化学习理论中，有几个核心要素：Agent、Environment、Observation、State、Action和Reward。Agent是执行动作的主体，它会根据自身的状态以及环境的状态（通过Observation获得），来决定下一步的动作。在训练过程中，每次执行动作后，Agent会收到一个Reward，用于更新算法，以便在下一次执行时获得更高的Reward。

ML Agent框架也完全采用了这些概念作为代码类的设计基础。在Unity的Game Loop中，一个MLAgent.Agent类可以从Unity环境中获取Observation向量，然后将其提供给预先训练好的神经网络模型，模型输出Action后，再将其应用到Unity环境中。

ML Agent框架包含运行时（推理，Inference）和训练（Training）两大模块。

## 推理

![Untitled](/images/mlagent1.png)

在设计MLAgent强化学习任务时，我们需要自定义一个Agent类，该类继承自MLAgent.Agent。通常，我们需要重写以下两个方法：

- `CollectObservations()`：在此方法中，我们需要收集Observation，这些Observation根据任务的不同，可以是物体的位置、速度、旋转角速度向量，也可以是framebuffer图片、raycast射线检测等。MLAgent提供了多种现成的Sensor供我们使用。
- `OnActionReceived()`：当Agent收到需要执行的Action时，我们需要在这个方法中将这些Action应用到环境中。根据任务的不同，这些Action可以是改变物体的transform、给rigidbody施加力、设置joint的目标位置等。

在重写这两个方法之间，Agent会自动调用神经网络模型进行计算，从Observation中获取Action。这个神经网络模型是一个Onnx格式的网络，由Unity Sentis执行。

需要注意的是，这两个方法是每帧都会被调用的。在`OnActionReceived`方法执行完毕后，下一帧的`CollectObservations`方法调用之前，会进行物理系统和环境的更新解算，如`FixedUpdate`。

## 训练

仍然在 Unity 环境中收集 Observation 和应用 Action，只不过，获取到的 Reward 以及 Action 的抉择，实际上在外部 Python进程中

你需要如下来安装这个训练环境。

```csharp
python -m pip install mlagents==1.1.0
```

![Untitled](/images/mlagent2.png)

Python 这一侧就是 Pytorch 实现的强化学习算法，用以训练出一个神经网络 Policy。ml-agent package中，提供了一些强化学习经典算法，比如Proximal Policy Optimzation(PPO), Soft Actor-Critic (SAC), POCA等。这里对于实现的算法并不多做解释，可见代码如

[https://github.com/Unity-Technologies/ml-agents/blob/develop/ml-agents/mlagents/trainers/ppo/optimizer_torch.py](https://github.com/Unity-Technologies/ml-agents/blob/develop/ml-agents/mlagents/trainers/ppo/optimizer_torch.py)

实机训练时，需要配置一个 config 

```csharp
default_settings:
  trainer_type: ppo
  hyperparameters:
    batch_size: 16
    buffer_size: 120
    learning_rate: 0.0003
    beta: 0.005
    epsilon: 0.2
    lambd: 0.99
    num_epoch: 3
    learning_rate_schedule: constant
  network_settings:
    normalize: true
    hidden_units: 256
    num_layers: 4
    vis_encode_type: match3
  reward_signals:
    extrinsic:
      gamma: 0.99
      strength: 1.0
  keep_checkpoints: 5
  max_steps: 5000000
  time_horizon: 128
  summary_freq: 10000
```

配置完成后，用 Python 进程通过命令行启动

```jsx
mlagents-learn config.yaml --run-id=<id>
```

然后在unity中启动编辑器，便可以看到开始训练。

### 通信

训练过程中，需要 Unity 进程和 Python 进程互相通信的，这里通信直接使用的 grpc。

proto定义在protobuf-definitions/proto/mlagents_env/communicator_objects中，

unity的消息都是这个结构

```jsx
message UnityMessageProto {
    HeaderProto header = 1;
    UnityOutputProto unity_output = 2;
    UnityInputProto unity_input = 3;
}
```

heading中定义了状态，

unity_input有如agent action，初始化状态等信息

unity_output有如agent info, 统计数据等信息

比如AgentAction的定义，和unity中的ActionBuffers结构体基本一致

```jsx
syntax = "proto3";

option csharp_namespace = "Unity.MLAgents.CommunicatorObjects";
package communicator_objects;

message AgentActionProto {
    repeated float vector_actions_deprecated = 1; // mark as deprecated in communicator v1.3.0
    reserved 2; // deprecated string text_actions = 2;
    reserved 3; //deprecated repeated float memories = 3;
    float value = 4;
    reserved 5; // deprecated CustomActionProto custom_action = 5;
    repeated float continuous_actions = 6;
    repeated int32 discrete_actions = 7;
}
```

可以理解是每一帧都会通过 grpc 交换输入和输出信息的。

# 总结

从上述描述中我们可以了解到，ML Agent采用了C/S架构，这主要是因为机器学习领域Python更为便捷，因此不得不进行语言分离。接下来，我们将ML Agent与另一套常用的强化学习方案Issac Gym进行对比。

|  | Unity ML Agent | Isaac Gym |
| --- | --- | --- |
| 架构 | C/S | Monolith |
| 开发语言 | C# + Python | Python |
| 开发环境 | Win/Linux/Mac | Linux |
| 物理引擎 | PhysX 4.1 | PhysX 5.x |
| 物理模拟后端 | CPU | GPU |

Issac Gym的一大优势在于它使用单一的编程语言，并且能够利用GPU进行模拟，从而大幅提升运算速度，这使得它看起来是一个更具吸引力的选择。然而，由于Unity的PhysX与IssacGym的PhysX在版本和参数上存在差异，导致IsaacGym训练的模型难以直接部署到Unity环境中。

相比之下，Unity ML Agent的主要优势在于它能够让模型直接在Unity中部署。因此，在需要在Unity环境中进行模型部署的场景下，Unity ML Agent具有不可替代的优势。然而，在非游戏领域，ML Agent框架的局限性可能就比较明显了，特别是与IsaacGym这样高效的模拟工具相比，可能会显得有些“鸡肋”。

对于机器人的模拟而言，IsaacGym可能是一个更好的选择，因为它能够提供更高效的模拟环境，从而帮助开发者更快地训练和测试模型。但在需要Unity环境支持的场景下，ML Agent仍然是不可或缺的工具。