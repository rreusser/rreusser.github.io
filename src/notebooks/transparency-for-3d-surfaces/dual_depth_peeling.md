# Introduction

Rendering semi-transparent materials accurately with non-uniform RGBA colors requires
composing fragments in depth order. Depth peeling [Everitt01] [Mammen84] is a robust
image-based solution to this problem which captures one layer of fragments each time the
geometry is rendered (geometry pass). Besides order-independent transparency, depth
peeling is useful for generating layered depth images and tracing bundles of rays. The major
drawback of the original depth peeling algorithm is that it requires one geometry pass per
peeled layer. Thus, to capture all the fragments of a scene of depth complexity N, depth
peeling requires N geometry passes. This is prohibitive for GPU-bound applications.

Dual depth peeling reduces the number of geometry passes from N to N/2+1 by applying
the depth peeling method from the front and from the back simultaneously. The one pass
overhead is due to the fact that our algorithm needs to work on two consecutive layers at a
time. Besides dual depth peeling, we also describe how the peeled fragments can be blended
on the fly based on the alpha blending equation.

We utilize new features of the GeForce 8: the min-max depth buffer for dual depth peeling
is an RG32F color texture with MAX blending (previously 32-bit float blending was not
supported), and the depth buffer for front-to-back depth peeling is a 32-bit depth buffer
(previously the maximum depth precision was 24 bits per pixel).

---

# Overview

## Depth Peeling

Depth peeling [Everitt01] starts by rendering the scene normally with a depth test, which
returns the nearest fragments to the eye. In a second pass, the depth buffer from the
previous pass is bound to a fragment shader. To avoid read-modify-write hazards, the source
and destination depth buffers are swapped every pass (ping ponging). If the fragment depth
is less or equal to the associated depth from the previous pass, then this fragment is
discarded and the next layer underneath is returned by the depth test. See Figure 2.

---

## Dual Depth Peeling

Conceptually, dual depth peeling performs depth peeling in both back-to-front and front-to-
back directions, peeling one layer from the front and one layer from the back every pass.
This would be simple to implement if the GPU had multiple depth buffers and if each depth
buffer was associated with a specific color textures. There would be one RGB texture for
back-to-front blending and one RGBA texture for front-to-back blending. However, in the
case of Figure 4, the layer in the middle would be peeled and blended both in the front-to-
back and the back-to-front blending textures. We solve this issue by working on a sliding
window of two consecutive layers. In addition, this makes it possible to implement a min-
max depth test with blending combined in the same shader ("blending on the fly"). We
implement a min-max depth buffer with an RG32F color texture, by using MIN blending to
perform the depth comparison. We essentially turn off the hardware depth buffer, and use
blending to perform the read-modify-write part of our custom depth test. The peeled
fragments from the front layers need to go though the under-blending equation, and the
fragments from the back layers through the over-blending equation. Finally, the two blended
images for the front and the back directions are blended together using under blending.

**Figure 3. Dual depth peeling advancing fronts.**

The algorithm works on sets of consecutive layers, two layers from the front and two layers
from the back. In the first pass, the outside set is initialized to the min and max depths and
no color is peeled yet. In the second pass, the shader processes the fragments matching the
depths of the previous outside set (dashed layers on Figure 3), and performs depth peeling
on the layers inside the outside set (plain layers on Figure 3).

When the front and back advancing fronts meet, fragments may be processed as either front
or back fragments. We process them as front fragments as in the following pseudo code:

```glsl
if (fragDepth == nearestDepth) {
    // process front fragment
} else {
    // process back fragment
}
```

---

# Implementation Details

## Depth Comparisons

The depth value written in the depth buffer is directly available in the fragment shader as
`gl_FragCoord.z`. So we want to compare `gl_FragCoord.z` with the depth stored in
the depth buffer at `gl_FragCoord.xy`. Because both `gl_FragCoord.z` and our depth
buffer are 32-bit floats, we can compare them without any bias.

---

## Under Blending

There are two ways to perform alpha blending. The most common way is to composite
fragments from back to front using the blending equation

> C_dst = A_src C_src + (1 - A_src) C_dst

This equation does not use the alpha channel of the destination color buffer. When peeling
layers of fragments from the front and compositing from front to back, the alpha blending
equation must be modified. A fragment color (C₁, A₁) blended over a color (C₂, A₂) over a
background color C₀, generates the following C₂' color:

- C₁' = A₁ C₁ + (1-A₁) C₀
- C₂' = A₂ C₂ + (1-A₂) C₁'
- C₂' = A₂ C₂ + (1-A₂) (A₁ C₁ + (1-A₁) C₀)
- C₂' = A₂ C₂ + (1-A₂) A₁ C₁ + (1-A₂) (1-A₁) C₀

The above equation shows that the fragments can be blended in front-to-back order with the
following separate blending equations:

> C_dst = A_dst (A_src C_src) + C_dst
>
> A_dst = (1 - A_src) A_dst

where A_dst is initialized to 1.0. This is performed efficiently by pre-multiplying C_src by A_src in
a shader and using separate blend equations for RGB and alpha with:

```c
glEnable(GL_BLEND);
glBlendEquation(GL_FUNC_ADD);
glBlendFuncSeparate(GL_DST_ALPHA,  GL_ONE,
                    GL_ZERO,       GL_ONE_MINUS_SRC_ALPHA);
```

Finally, the blended fragments are composited with the background color C_bg using a
fragment shader implementing C_dst = A_dst C_bg + C_dst.

---

## Render Targets

The GeForce 8 supports 32-bit floating-point blending. By using MAX blending and writing
`float2(-depth, depth)` in a shader, we can render the min and max depths for every pixel. This
way, one can implement depth peeling on (-depth) and (depth), effectively peeling from the
front and form the back simultaneously.

Our dual depth peeling fragment shader (`shaders/dual_peeling_peel_fragment.glsl`) writes to
2 color textures. This render to multiple render targets is implemented in OpenGL using
framebuffer objects (FBOs). Render target RT0 is for the min-max depth buffer, RT1 for
dumping the front fragments and RT2 for dumping the back fragments.

The GeForce 8 does not support independent blending equation for different render targets.
Since we need either MIN or MAX blending for the min-max depth buffer, we need to use
MIN or MAX blending with all our render targets. We use MAX blending and initialize the
dumping color textures to 0.0f every pass. This essentially allows us to perform MAX
blending on one render target and REPLACE blending on the two other targets. The
internal texture formats are RG32F for RT0 (min-max depth buffer), RGBA8 for RT1 (front
fragments to be blended under) and RGBA8 for RT2 (back fragments to be blended over).

---

## Blending on the Fly

With DirectX 10.1, it will be possible to setup the under-blending equation on render target
1, and the over blending equation on render target 2. We can work around it by observing that
every pass, at most one front fragment and one back fragment need to be blended. Thus, we
can dump the fragments to textures using REPLACE blending as explained above, and
blend them in a full screen pass.

In addition, because under blending is essentially additive blending, the RGB color with
under blending increases every pass. So we can use MAX blending and our default pass-
through, and perform the additive blending in the dual depth peeling shader. Besides, we use
the third component of RT0 to store the (1-A_dst) component necessary for under blending,
which works because A_dst decreases every pass (multiplied by (1-A_src) every pass). Thus,
MAX blending is applied to `float3(-depth, depth, 1-A_dst)`.

---

# Single-Pass Approximations

## Weighted Average

At GDC 2007, [Meshkin07] presented the idea of simplifying the alpha blending equation to
make it order independent. The proposed strategy was to expand the alpha blending
equation and to ignore the order-dependent terms. This method produces plausible images
for low alpha values. However, it produces overly dark or bright images (according to what
terms are ignored) except for low alpha (< 30% opaque).

Our weighted average technique is similar but does not ignore any term. It builds on the
following observation. If all the RGBA colors were identical for a given pixel, then the result
would be independent on the order in which the fragments are alpha blended. Now, in the
case where the RGBA colors are not uniform, what if we replaced the multiple colors per
pixel by a uniform color per pixel, such as the average color per pixel? To handle non-
uniform alphas, we use an alpha-weighted average of the colors for every pixel.

The average RGBA color for each pixel is generated by rendering the transparent geometry
into an accumulation buffer implemented as a 16-bit floating-point texture. The result is an
accumulated RGBA color and the number of fragments per pixel (depth complexity). After
this geometry pass, the accumulation buffer is passed to a post-processing full screen pass,
which performs a weighted average of RGB by alpha, yielding a weighted average color C:

> C = Σ[(RGB) A] / ΣA

The average alpha is also computed from the accumulated alpha and the depth complexity n:

> A = ΣA / n

Then the alpha blending equation is approximated by replacing all the terms with the average
color C and the average alpha A. Since Σ[1-A, n=0..n-1] = (1-(1-A)^n)/(1-(1-A)), the
blended color C_dst is only a function of C, A, n, and the background color C_bg:

> C_dst = C A Σ[(1-A)^k, k=0..n-1] + C_bg (1-A)^n
>
> C_dst = C A (1-(1-A)^n)/A + C_bg (1-A)^n

The color and alpha sums are computed using additive 16-bit float blending, adding together
the RGBA colors in one render target, and the depth complexity n in another target.

---

## Weighted Sum

We compare our weighted average method with the weighted sum formula introduced at
GDC 2007. There are two versions of this technique. Here is the simple formula which is in
fact a weighted sum [Meshkin07]:

> C_dst = Σ[A_src C_src] + C_bg (1 - ΣA_src)
