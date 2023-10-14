---
title: Terrain Cliff Problem | 地形峭壁问题
date: 2018-05-12 00:00:00
---

1. 拆侧坡，用侧坡为基础生成侧坡的几何体，triplaner，代表：FarCry5
2. 贴面，更进一步用启发式算法来贴面平铺，代表：hauntless
3. 拆侧破，展uv，需要几个要点：

![e3f978445870d3a6f505656581ebf99d.png](/images/e3f978445870d3a6f505656581ebf99d.png)

1 分块：用GameDevtool的AutoUV的Cluster比较好

![ScreenClip.png](/images/ScreenClip.png)

2 分拆孤岛，收缩扩张就好了

![ScreenClip-1.png](/images/ScreenClip-1.png)

收缩用了一个loop

```
float step = 0.1;

if(@weight <= step){
    @weight = 0;
    return;
}

int neibs[] = neighbours(0, @ptnum);
int neighborAllZero = 0;
int neighborAllPosi = 1;
int neighborHasZero = 0;
float min_neib_weight = 10000;

foreach(int neib ; neibs){
    vector position = point(0, "P", neib);
    float weight = point(0, "weight", neib);
    if(weight < step){
        neighborAllPosi = 0;
    }
    if(weight > 0){
        neighborAllZero = 1;
    }

    if(weight == 0){
        neighborHasZero = 1;
    }

    float distance = distance(position, @P);

    if(weight + distance < min_neib_weight){
        min_neib_weight = weight+distance;
    }
}   

if(neighborAllZero == 0){
    @weight -= step;
}
else if(neighborAllPosi == 1){
    return;
}
else if( neighborHasZero == 1){
    f@weight -= step;
}
else{
    f@weight = min_neib_weight - step;
}
```

![ScreenClip-3.png](/images/ScreenClip-3.png)

扩张用了一个loop
```
if(@class > -0.5){
    return;
}

int neibs[] = neighbours(0, @ptnum);
int minclass = -1;

foreach(int neib; neibs){
    float thisclass=  point(0, "class", neib);
    if(thisclass > minclass){
        minclass = thisclass;
    }
}

if(minclass > -0.5){
    @class = minclass;
}
```

这样UV就能拆成小片了

![ScreenClip-2.png](/images/ScreenClip-2.png)

3 矫正UV

基本思路：我们假设uv已经展好，且应该接近平面形状。这是一组点在二维平面内的投影。之后我们将顶点投影到法平面上，这是同样一组点在二维平面内的另一个投影。我们希望找出一个旋转量，使得这两组投影尽可能接近。解析方法应该是用这个角度建立方程，求个导求值为0的解；采用的近似做法是，计算每个点的旋转角度求平均。

```
vector pos0 = point(0, "P", 0);
vector uv0= point(0, "uv_transfered", 0);
vector avgNormal = normalize(v@avgN);
float anglesum = 0;
vector center = getbbox_center(0) ;
vector uvcenter = (0,0,0);

for(int i = 1; i < @numpt; i++){
    uvcenter += point(0, "uv_transfered", i);
}
uvcenter /= (@numpt - 1);
vector up = (0,1,0);
up.y = 1;
vector avgPlaneX = cross(up, avgNormal);
vector avgPlaneY = cross(avgNormal, avgPlaneX);
v@avgX = avgPlaneX;
v@avgY = avgPlaneY;

for(int i = 1; i < @numpt; i++){
    vector thispos = point(0, "P", i);
    vector thisuv = point(0, "uv_transfered", i);
    
    vector position_offset = (thispos - center);
    vector uv_offset = normalize(thisuv - uvcenter);

    float position_offset_project_on_angN = dot(avgNormal, position_offset);

    vector position_offset_project_on_angNPlane = position_offset - position_offset_project_on_angN * avgNormal;
    float onX = dot(avgPlaneX, position_offset_project_on_angNPlane);
    float onY = dot(avgPlaneY, position_offset_project_on_angNPlane);
    vector onAvgPlane = (0,0,0);
    onAvgPlane.x = onX;
    onAvgPlane.y = onY;
    //setpointattrib(0, "P", i, center + onX * avgPlaneX + onY * avgPlaneY);

    float dot = dot(normalize(onAvgPlane), uv_offset);
    float angle = acos(dot);
    vector crossangle = cross(normalize(onAvgPlane), uv_offset);
    if(crossangle.z>0){
        if(dot > 0){
            angle = -angle;
        }
        else{
            angle = 2*3.1416 - angle;
        }
    }

    anglesum += angle;
    setpointattrib(0, "errorness", i, dot);
    //setpointattrib(0, "errorness", i, angle * 360 / (2 * 3.14159));
    setpointattrib(0, "pos_offset", i, normalize(onAvgPlane));
    setpointattrib(0, "uv_offset", i, uv_offset);
    //@errorness = dot(position_offset, uv_offset);
}

anglesum /= (@numpt - 1);
@anglesum = anglesum * 360 / (2 * 3.14159);
```

![ScreenClip-4.png](/images/ScreenClip-4.png)

这样就基本矫正了UV

![HighresScreenshot00004.png](/images/HighresScreenshot00004.png)

![HighresScreenshot00002.png](/images/HighresScreenshot00002.png)
