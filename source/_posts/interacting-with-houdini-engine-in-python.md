---
title: Interacting with Houdini Engine in Python | 使用Python与Houdini Engine交互
date: 2020-01-17 00:00:00
---

Houdini Engine是Houdini的一个无图形界面简化版，可以通过houdini engine与houdini内核交互，完成houdini fx中的操作。

官方有For Maya, For Max, For Unity, For Unreal四个插件，可以在这四个host程序中调用houdini engine。这是极好的，意味着开发的HDA资源可以直接应用在host程序中。不过笔者并不满足于此，是否可以不用host环境直接调用houdini engine？当然可以，官方提供了一套C API  [https://www.sidefx.com/docs/hengine/](https://www.sidefx.com/docs/hengine/) . 只不过笔者看着它就头疼，主要两个问题

- 面向过程，不面向对象
- 语法繁琐

这也是笔者开发pyhapi的初衷，希望面向对象，简化语法。

怎么安装

已经发布到PyPI，安装直接使用pip即可

```
pip install pyhapi
```

要求py>3.6, 因为用了asyncio异步库

numpy>1.15

Houdini17.5测试没问题，需要commercial license. Houdini18尚未测试

[https://github.com/maajor/pyhapi](https://github.com/maajor/pyhapi)

[https://pypi.org/project/pyhapi/](https://pypi.org/project/pyhapi/)

当然要注意的是，请确保houdini dll路径在PATH中

使用

目前支持的功能:

- 实例化节点，HDA
- 节点连接操作
- 节点参数设置
- 节点异步cook
- 传入/出 曲线，模型

还不支持的：

- 传入/出 体素
- PDG

举例来说，如果想实例化一个HDA，传入参数，cook，可以这样：

```
# -*- coding: utf-8 -*-
"""Example of getting/setting params of HDA asset
Author  : Maajor
Email   : hello_myd@126.com
"""
import pyhapi as ph

def main():
    session = ph.HSessionManager.get_or_create_default_session()

    #load hda asset and instantiate
    hda_asset = ph.HAsset(session, "hda/SideFX_spaceship.otl")
    asset_node = hda_asset.instantiate(node_name="Spaceship")

    #Set node's parameters
    asset_node.set_param_value("seed", 1.0)
    asset_node.set_param_value("rop_geometry1_sopoutput", "$HIP/spaceship.obj")

    #Press button
    asset_node.press_button("rop_geometry1_execute", status_report_interval=1.0)

    session.save_hip("spaceship.hip")

if __name__ == "__main__":
    main()

```

执行完以后就可以输出spaceship.obj模型啦

对比一下C API的官方案例Parameters.c

两百多行其实就干了一件事：实例化一个HDA，打印出它所有参数

```
#include <HAPI/HAPI.h>
#include <iostream>
#include <string>

#define ENSURE_SUCCESS( result ) 
if ( (result) != HAPI_RESULT_SUCCESS ) 
{ 
    std::cout << "Failure at " << __FILE__ << ": " << __LINE__ << std::endl; 
    std::cout << getLastError() << std::endl; 
    exit( 1 ); 
}

#define ENSURE_COOK_SUCCESS( result ) 
if ( (result) != HAPI_RESULT_SUCCESS ) 
{ 
    std::cout << "Failure at " << __FILE__ << ": " << __LINE__ << std::endl; 
    std::cout << getLastCookError() << std::endl; 
    exit( 1 ); 
}

static std::string getLastError();
static std::string getLastCookError();
static std::string getString( HAPI_StringHandle stringHandle );

int
main( int argc, char ** argv )
{
    const char * hdaFile = argc == 2 ? argv[ 1 ] : "examples/SideFX_spaceship.otl";
    
    HAPI_CookOptions cookOptions = HAPI_CookOptions_Create();

    HAPI_Session session;

    HAPI_CreateInProcessSession( &session );

    ENSURE_SUCCESS( HAPI_Initialize( &session,
                     &cookOptions,
                     true,
                     -1,
                     nullptr,
                     nullptr,
                     nullptr,
                     nullptr,
                     nullptr ) );

    HAPI_AssetLibraryId assetLibId;
    ENSURE_SUCCESS( HAPI_LoadAssetLibraryFromFile( &session, hdaFile, true, &assetLibId ) );

    int assetCount;
    ENSURE_SUCCESS( HAPI_GetAvailableAssetCount( &session, assetLibId, &assetCount ) );

    if (assetCount > 1)
    {
    std::cout << "Should only be loading 1 asset here" << std::endl;
    exit ( 1 );
    }
    
    HAPI_StringHandle assetSh;
    ENSURE_SUCCESS( HAPI_GetAvailableAssets( &session, assetLibId, &assetSh, assetCount ) );

    std::string assetName = getString( assetSh );

    HAPI_NodeId nodeId;
    ENSURE_SUCCESS( HAPI_CreateNode( &session, -1, assetName.c_str(), "AnAsset", false, &nodeId ) );

    ENSURE_SUCCESS( HAPI_CookNode( &session, nodeId, &cookOptions ) );
    
    int cookStatus;
    HAPI_Result cookResult;

    do
    {
    cookResult = HAPI_GetStatus( &session, HAPI_STATUS_COOK_STATE, &cookStatus );
    }
    while (cookStatus > HAPI_STATE_MAX_READY_STATE && cookResult == HAPI_RESULT_SUCCESS);

    ENSURE_SUCCESS( cookResult );
    ENSURE_COOK_SUCCESS( cookStatus );
    
    HAPI_NodeInfo nodeInfo;
    ENSURE_SUCCESS( HAPI_GetNodeInfo( &session, nodeId, &nodeInfo ) );
    
    HAPI_ParmInfo * parmInfos = new HAPI_ParmInfo[ nodeInfo.parmCount ];
    ENSURE_SUCCESS( HAPI_GetParameters( &session, nodeId, parmInfos, 0, nodeInfo.parmCount ) );

    // Print parameter info
    std::cout << "Parameters: " << std::endl;

    for( int i = 0; i < nodeInfo.parmCount; ++i )
    {
    std::cout << "==========" << std::endl;

    std::cout << "   Name: "
          << getString( parmInfos[ i ].nameSH )
          << std::endl;

    std::cout << "   Values: (";

    if ( HAPI_ParmInfo_IsInt( &parmInfos[ i ] ) )
        {
        int parmIntCount = HAPI_ParmInfo_GetIntValueCount( &parmInfos[ i ] );
        
        int * parmIntValues = new int[ parmIntCount ];
        
        ENSURE_SUCCESS( HAPI_GetParmIntValues( &session,
                           nodeId, parmIntValues,
                           parmInfos[ i ].intValuesIndex,
                           parmIntCount ) );

        for ( int v = 0; v < parmIntCount; ++v )
        {
        if ( v != 0 )
            std::cout << ", ";

        std::cout << parmIntValues[ v ];
        }
        
        delete [] parmIntValues;
    }
    else if ( HAPI_ParmInfo_IsFloat( &parmInfos[ i ] ) )
        {
        int parmFloatCount = HAPI_ParmInfo_GetFloatValueCount( &parmInfos[ i ] );

        float * parmFloatValues = new float[ parmFloatCount ];
        
        ENSURE_SUCCESS( HAPI_GetParmFloatValues( &session,
                             nodeId, parmFloatValues,
                             parmInfos[ i ].floatValuesIndex,
                             parmFloatCount ) );
        
        for ( int v = 0; v < parmFloatCount; ++v )
        {
        if ( v != 0 )
            std::cout << ", ";

        std::cout << parmFloatValues[ v ];
        }
        
        delete [] parmFloatValues;
    }
    else if ( HAPI_ParmInfo_IsString( &parmInfos[ i ] ) )
    {
        int parmStringCount = HAPI_ParmInfo_GetStringValueCount( &parmInfos[ i ] );

        HAPI_StringHandle * parmSHValues = new HAPI_StringHandle[ parmStringCount ];
    
        ENSURE_SUCCESS( HAPI_GetParmStringValues( &session,
                              nodeId,
                              true, parmSHValues,
                              parmInfos[ i ].stringValuesIndex,
                              parmStringCount ) );
        
        for ( int v = 0; v < parmStringCount; ++v )
        {
        if ( v != 0 )
            std::cout << ", ";
        
        std::cout << getString( parmSHValues[ v ] );
        }

        delete [] parmSHValues;
    }
        
    std::cout << ")" << std::endl;
    }

    delete [] parmInfos;

    char in;
    std::cout << "Press any key to exit" << std::endl;
    std::cin >> in;
    
    HAPI_Cleanup( &session );
    
    return 0;
}

static std::string
getLastError()
{
    int bufferLength;
    HAPI_GetStatusStringBufLength( nullptr,
                   HAPI_STATUS_CALL_RESULT,
                   HAPI_STATUSVERBOSITY_ERRORS,
                   &bufferLength );

    char * buffer = new char[ bufferLength ];

    HAPI_GetStatusString( nullptr, HAPI_STATUS_CALL_RESULT, buffer, bufferLength );

    std::string result( buffer );
    delete [] buffer;

    return result;
}

static std::string
getLastCookError()
{
    int bufferLength;
    HAPI_GetStatusStringBufLength( nullptr,
                   HAPI_STATUS_COOK_RESULT,
                   HAPI_STATUSVERBOSITY_ERRORS,
                   &bufferLength );

    char * buffer = new char[ bufferLength ];

    HAPI_GetStatusString( nullptr, HAPI_STATUS_COOK_RESULT, buffer, bufferLength );

    std::string result( buffer );
    delete[] buffer;

    return result;
}

static std::string
getString( HAPI_StringHandle stringHandle )
{
    if ( stringHandle == 0 )
    {
    return "";
    }

    int bufferLength;
    HAPI_GetStringBufLength( nullptr,
                   stringHandle,
                   &bufferLength );

    char * buffer = new char[ bufferLength ];

    HAPI_GetString ( nullptr, stringHandle, buffer, bufferLength );

    std::string result( buffer );
    delete [] buffer;

    return result;
}

```

用pyhapi的话十行以内：

```
import pyhapi as ph

def main():
    session = ph.HSessionManager.get_or_create_default_session()

    #load hda asset and instantiate
    hda_asset = ph.HAsset(session, "hda/SideFX_spaceship.otl")
    asset_node = hda_asset.instantiate(node_name="Spaceship")

    #Query node's parameters
    for name in asset_node.get_param_names():
        print("Query param: {0} has value: {1}".format(name, asset_node.get_param_value(name)))

if __name__ == "__main__":
    main()
```

当然我们还可以把一个模型/曲线，传入/取出houdini engine，比如mesh_marshall_input.py这个例子，传进去一个方块，然后做了细分

```
# -*- coding: utf-8 -*-
"""Example of setting mesh data into hengine
Author  : Maajor
Email   : hello_myd@126.com
"""
import numpy as np
import pyhapi as ph

def main():
    """Main
    """
    session = ph.HSessionManager.get_or_create_default_session()

    #create an inputnode where you can set geometry
    geo_inputnode = ph.HInputNode(session, "Cube")

    #create a geomesh
    cube_geo = ph.HGeoMesh(
        vertices=np.array(
            [[0.0, 0.0, 0.0],
             [0.0, 0.0, 1.0],
             [0.0, 1.0, 0.0],
             [0.0, 1.0, 1.0],
             [1.0, 0.0, 0.0],
             [1.0, 0.0, 1.0],
             [1.0, 1.0, 0.0],
             [1.0, 1.0, 1.0]], dtype=np.float32),
        faces=np.array(
            [[0, 2, 6, 4],
             [2, 3, 7, 6],
             [2, 0, 1, 3],
             [1, 5, 7, 3],
             [5, 4, 6, 7],
             [0, 4, 5, 1]], dtype=np.int32))

    #set this geomesh as geometry of inputnode
    geo_inputnode.set_geometry(cube_geo)

    #create a node whose input is inputnode
    ph.HNode(session, "Sop/subdivide", "Cube Subdivider").connect_node_input(geo_inputnode)

    session.save_hip()

if __name__ == "__main__":
    main()

```

内部怎么实现的？

Python可以和C很好地实现交互

类似其他几个平台，

Unity 用的c#，dllimport就行

Unreal就是cpp，include进来就行

Python用ctypes就能加载dll

```
sys = platform.system()
if sys == "Windows":
    HAPI_LIB = ctypes.cdll.LoadLibrary("libHAPIL")
elif sys == "Linux":
    HAPI_LIB = ctypes.cdll.LoadLibrary("libHAPIL.so")
```

这就直接可以调用libHAPIL的方法了

```
HAPI_LIB.HAPI_IsSessionValid(byref(session))
```

源码里hapi.py里全部是对libHAPIL的封装，hdata.py里全是houdini engine的struct

除此以外，hsession封装session对象，hnode封装node对象，hgeo封装geo对象，hasset封装HDA对象

总共就这六个文件

可以干什么？

为了Houdini Pipeline咯

可以做

- 资产自动化处理
- HDA自动化测试
- HDA管理
- etc...

祝读者春节快乐，百病不侵！

[https://www.sidefx.com/products/houdini-engine/](https://www.sidefx.com/products/houdini-engine/)
