---
title: Maya Python Workflow | Maya Python工作流程
date: 2017-08-31 00:00:00
tags:
  - Maya
  - Python
  - Technical
  - Pipeline
  - Automation
  - Game Development
---

PyMel是一个Mel的python wrapper，简直比MEL友好太多

主要它面向对象的，可以用mesh.vtx, tranform.getShape()之类的操作。原生MEL都得用listRelative来找

PyMel的文档在[http://help.autodesk.com/cloudhelp/2017/ENU/Maya-Tech-Docs/PyMel/modules.html](http://help.autodesk.com/cloudhelp/2017/ENU/Maya-Tech-Docs/PyMel/modules.html)

部署环境需要做几件事

# 1 devkit

2016的devkit需要单独下载 地址在[https://apps.autodesk.com/MAYA/en/Detail/Index?id=5595681162321676385&os=Win64&appLang=en](https://apps.autodesk.com/MAYA/en/Detail/Index?id=5595681162321676385&os=Win64&appLang=en)

# 2 外部编辑器部署

笔者使用的Sublime Text

当然第一件事是装Package Control，参考官方文档就好了[https://packagecontrol.io/installation#st2](https://packagecontrol.io/installation#st2)

用手动装了一下

接下来要装两个package，第一个是MayaSublime，用于sublime与maya通信。第二个是Jedi Syntax，用于自动补全代码

MayaSublime装好需要设置一下maya启动代码，让maya启动以后打开与sublime的通信端口。

在C:/Users/hzmayidong/Documents/maya/2016.5/scripts下新建userSetup.py

```
import maya.cmds as cmds
# Close ports if they were already open under another configuration
try:
    cmds.commandPort(name=":7001", close=True)
except:
    cmds.warning('Could not close port 7001 (maybe it is not opened yet...)')
try:
    cmds.commandPort(name=":7002", close=True)
except:
    cmds.warning('Could not close port 7002 (maybe it is not opened yet...)')
# Open new ports
cmds.commandPort(name=":7001", sourceType="mel")
cmds.commandPort(name=":7002", sourceType="python")
```

之后在sublime中写的代码用ctrl+enter就可以发送到maya执行了

Jedi在sublime中参数设置需要加一些：

```
    "python_interpreter": "C:/Program Files/Autodesk/Maya2016.5/bin/mayapy.exe",
    // Additional python package paths.
    "python_package_paths": [
        "C:/Program Files/Autodesk/Maya2016.5/devkit/other/pymel/extras/completion/py"
    ]
```

就是python解释器用的maya版本，包用的maya的

# 3 外部包

maya python之中可以安装PyPI的包的，就像普通python用pip install那样

需要安装一个ez_setup

可以参考这篇：

[http://jensvhansen.com/installing-new-packages-for-maya-python/](http://jensvhansen.com/installing-new-packages-for-maya-python/)

```
from setuptools.command import easy_install
easy_install.main( ["xlrd"] )
```

另外PySide是已经包括了的，也就是直接可以用Maya Python写QT的

参考文档:

[http://help.autodesk.com/view/MAYAUL/2017/ENU/?guid=__files_GUID_3F96AF53_A47E_4351_A86A_396E7BFD6665_htm](http://help.autodesk.com/view/MAYAUL/2017/ENU/?guid=__files_GUID_3F96AF53_A47E_4351_A86A_396E7BFD6665_htm)

# 4 PyMel用法

常用的

pm.select()用于选物件

pm.ls()用于获取物件

获取到的物件用getShape()可以获取mesh数据

mesh.vtx, mesh.f, mesh.e可以获得MeshVertex, MeshFace, MeshEdge的数据

这都可以查文档了

5 QtDesigner + PySide

C:/Program Files/Autodesk/Maya2016.5/bin>mayapy pyside-uic -o TerrainBuilderUI.py terrainBuilder.ui
