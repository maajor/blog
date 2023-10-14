---
title: Procedural Street Modelling In Houdini 1 | Houdini中程序式街道生成 I
date: 2018-08-17 00:00:00
---

路网的程序式生成前人曾经提出过多种方式，比如用模板，用L-System，用代理(Agent-Based)，用张量场(Tensor Field)。其中比较实用的是L系统和张量场，前者也就是CityEngine中使用的方式。[Parish and Muller, 2001]这里的L系统不是传统的字符串替换的L系统，虽然思想一致，用递归替换的方式衍生，但在Extended L系统中，可替换的可以是复杂的带变量的函数，而不仅仅是简单的Turtle移动了。这我们后面再说，这里主要讲张量场的实现[Chen, 2008]

基本思路是：

1. 根据地形生成张量场，可以多个张量场叠加
2. 根据张量场生成道路

张量定义是

![4df846a056c03c968644e3b9e5a77a78.png](/images/4df846a056c03c968644e3b9e5a77a78.jpg)

它可以有两个互相垂直的本征向量，这个特性很好，很多路网交叉口是垂直的。

1 张量场生成

可以有多种，比如格网的，轴向的。延海岸线和河流线可以有顺应边缘的张量场，沿高度图也可以有顺应梯度的张量场。

以下为houdini的实现

![2ac6f21de591d03020beda60e26cfb12.png](/images/2ac6f21de591d03020beda60e26cfb12.jpg)

![a6e348c745ca48f59913c8430bafac9e.png](/images/a6e348c745ca48f59913c8430bafac9e.jpg)

![96c7b2591e923ab06a3e73db2819d145.png](/images/96c7b2591e923ab06a3e73db2819d145.jpg)

多种张量场可以叠加混合起来

以下为houdini的实现

![228482bb1c5f9a2858cce33c84f3b240.png](/images/228482bb1c5f9a2858cce33c84f3b240.jpg)

之后呢这些张量场还可以加噪声。。。

![b2369f1e516ae887eeb9ac366fa13294.png](/images/b2369f1e516ae887eeb9ac366fa13294.jpg)

2 主干路生成

从一些随机点开始沿主本征向量方向走，隔一段距离布一个种子点，直到走不下去；按一定规则选一个种子点开始按次本征向量方向移动，布种子点直到走不动；继续选种子点，换方向，布种子点。

```
当还有种子点，循环：
    选取优先级最高的种子点
    直到走不动，循环：
        沿某个本征向量方向移动
        隔一定距离布种子点
    切换到另一个本征向量方向
```

单个流线移动策略：

就跟着本征向量走就好了，退出条件：1. 出边界了 2. 到了退化点 3. 回到起点了 4. 超出最大长度 5. 离另一个流线太近了，如果这样就往前找一找看能不能接上

种子优先度策略：

到水的距离，到退化点的距离，到城市中心的距离，几个距离按负幂指数加起来作为评价函数。种子是放优先队列里的。

基本思路还是比较简单的，但在houdini里实现起来并不那么容易，下面是一个演示动画

[2008-SG-Chen-InteractiveProceduralStreetModeling.pdf](./file/2008-SG-Chen-InteractiveProceduralStreetModeling.pdf)

[http://martindevans.me/game-development/2015/12/11/Procedural-Generation-For-Dummies-Roads/](http://martindevans.me/game-development/2015/12/11/Procedural-Generation-For-Dummies-Roads/)

[roadcurve.hip](./file/roadcurve.hip)

[p_Par01.pdf](./file/p_Par01.pdf)

用线来生成路面和路中的面：

[44da13e618ca8b399f004e713603e54e17cb.pdf](./file/44da13e618ca8b399f004e713603e54e17cb.pdf)

curve to street

```
function int getNearPointId(vector sideDir; vector lineDir; int ptnum; int otherpt){
    int neibs[] = neighbours(0, ptnum);
    if(len(neibs) == 1){
        return neibs[0];
    }
    else{
        vector thispos = point(0, "P", ptnum);
        float minAngle = 6.28;
        int minId = neibs[0];
        foreach(int id; neibs){
            if(id == otherpt){
                continue;
            }
            vector otherPos = point(0, "P", id);
            vector toDir = normalize(otherPos - thispos);
            float dotLine = dot(toDir, -lineDir);
            float dotDir = dot(toDir, sideDir);
            float acos = acos(dotLine);
            if(dotDir < 0){
                acos = 6.28 - acos;
            }
            if(acos < minAngle){
                minAngle = acos;
                minId = id;
            }
        }
        return minId;
        
    }
    
}

//left: isleft = 1; right : isleft = 0;
function vector getGuideDir(int ptstart; int ptend; int isLeft){
    vector pos1 = point(0, "P", ptstart);
    vector pos2 = point(0, "P", ptend);
    
    vector toVec = normalize(pos2 - pos1);
    vector up = {0,1,0};
    if(isLeft > 0.5){
        return cross(up, toVec);
    }else{
        return cross(toVec, up);
    }
}

function vector2 solveIntersection(vector start1; vector start2; vector dir1; vector dir2){
    
    vector2 dir1xz, dir2xz;
    dir1xz.x = dir1.x;
    dir1xz.y = dir1.z;
    dir2xz.x = dir2.x;
    dir2xz.y = dir2.z;
    if(abs(dot(normalize(dir1xz), normalize(dir2xz))) > 0.9999){
        vector2 rtresult;
        rtresult.x = (start1.x + start2.x) / 2;
        rtresult.y = (start1.z + start2.z) / 2;
        return rtresult;
    }
    vector2 start1xz, start2xz;
    start1xz.x = start1.x;
    start1xz.y = start1.z;
    start2xz.x = start2.x;
    start2xz.y = start2.z;
    
    float t2 = ( start1xz.x * dir1xz.y - start1xz.y * dir1xz.x + start2xz.y * dir1xz.x - start2xz.x * dir1xz.y) / ( dir2xz.x * dir1xz.y - dir2xz.y * dir1xz.x);
    vector2 result = start2xz + t2 * dir2xz;
    return result;
}

function vector getOffsetPosition(int pt1; int ptmid; int pt2; float offsetDist1; float offsetDist2; vector dirGuide){
    vector pos1 = point(0, "P", pt1);
    vector posmid = point(0, "P", ptmid);
    vector pos2 = point(0, "P", pt2);
    
    vector to1 = normalize(pos1 - posmid);
    vector to2 = normalize(pos2 - posmid);
    
    vector cross1 = cross(to1, dirGuide);
    vector cross2 = cross(to2, dirGuide);
    
    cross1.x = 0;
    cross1.z = 0;
    cross2.x = 0;
    cross2.z = 0;
    
    vector offsetVec1 = cross(cross1, to1);
    vector offsetVec2 = cross(cross2, to2);
    
    vector start1 = posmid + offsetDist1 * normalize(offsetVec1);
    vector start2 = posmid + offsetDist2 * normalize(offsetVec2);
    
    vector2 resultVecXZ = solveIntersection(start1, start2, to1, to2);
    vector resultVec;
    resultVec.x = resultVecXZ.x;
    resultVec.z = resultVecXZ.y;
    resultVec.y = (start1.y + start2.y) / 2;
    return resultVec;
}

int pts[] = primpoints(0, @primnum);
//printf("lens %sn", len(pts));
float width = 0.02;

if(len(pts) == 2){
    vector pos1 = point(0, "P", pts[0]);
    vector pos2 = point(0, "P", pts[1]);
    
    vector linedir = normalize(pos2 - pos1);
    vector up = {0,1,0};
    vector leftDir = getGuideDir(pts[0], pts[1], 1);
    vector rightDir = getGuideDir(pts[0], pts[1], 0);
    
    int ptidleftnear2 = getNearPointId(leftDir, linedir, pts[1], pts[0]);
    int ptidleftnear1 = getNearPointId(leftDir, -linedir, pts[0], pts[1]);
    
    vector ln2Dir = getGuideDir(pts[1], ptidleftnear2, 1);
    vector ln1Dir = getGuideDir(ptidleftnear1, pts[0], 1);
    
    int ptidrightnear2 = getNearPointId(rightDir, linedir, pts[1], pts[0]);
    int ptidrightnear1 = getNearPointId(rightDir, -linedir, pts[0], pts[1]);
    
    vector rn2Dir = getGuideDir(pts[1], ptidrightnear2, 0);
    vector rn1Dir = getGuideDir(ptidrightnear1, pts[0], 0);
    
    vector left1 = getOffsetPosition(ptidleftnear1, pts[0], pts[1], width, width, ln1Dir + leftDir);
    vector left2 = getOffsetPosition(pts[0], pts[1], ptidleftnear2, width, width, ln2Dir + leftDir);
    vector right1 = getOffsetPosition(ptidrightnear1, pts[0], pts[1], width, width, rn1Dir + rightDir);
    vector right2 = getOffsetPosition(pts[0], pts[1], ptidrightnear2, width, width, rn2Dir + rightDir);
    
    int addleft1 = addpoint(0, left1);
    int addleft2 = addpoint(0, left2);
    
    @ptidleftnear1 = ptidleftnear1;
    @ptidleftnear2 = ptidleftnear2;
    @pos1 = pts[0];
    @pos2 = pts[1];
    int addright1 = addpoint(0, right1);
    int addright2 = addpoint(0, right2);
    
    addprim(0, "poly", addleft1, addleft2, addright2, addright1);

}

```

CityEngine L-system

[https://josauder.github.io/procedural_city_generation/](https://josauder.github.io/procedural_city_generation/)

[bidarra-3AMIGAS-RS.pdf](./file/bidarra-3AMIGAS-RS.pdf)

%!(EXTRA markdown.ResourceType=, string=, string=)

%!(EXTRA markdown.ResourceType=, string=, string=)

%!(EXTRA markdown.ResourceType=, string=, string=)

%!(EXTRA markdown.ResourceType=, string=, string=)

[http://martindevans.me/game-development/2015/12/27/Procedural-Generation-For-Dummies-Lots/](http://martindevans.me/game-development/2015/12/27/Procedural-Generation-For-Dummies-Lots/)

%!(EXTRA markdown.ResourceType=, string=, string=)

%!(EXTRA markdown.ResourceType=, string=, string=)
