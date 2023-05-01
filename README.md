# 背景

昨天看到一篇文章，[面试官问我按钮级别权限怎么控制，我说v-if，面试官说再见 - 掘金 (juejin.cn)](https://juejin.cn/post/7209648356530896953)，里面介绍了三种权限校验方式，看起来挺不错。但是，考虑到对于按钮细粒度要求高的场景，如果每一个按钮权限都去设置 v-auth='xxx.xxx.xx'的话，累死人不说，还非常容易出错。

这里简单列举使用v-auth指令不方便的场景。

1. 同一个包含权限按钮组件，放到不同的父组件中，需要父组件透传`v-auth`路径。
2. 当权限按钮组件所处的环境变化后，需要先修改`v-auth`路径，然后再去管理中心调整对应的配置。(如按钮本来在 tab1下，`v-auth`值为`tab1-编辑`，当你的tab1名称改为tab2时，你不得不手动遍历tab1下的所有v-auth，将`tab1-xxx`变为`tab2-xxx`，过程相当繁琐且容易出错。)
3. `v-auth`的值为手动输入，手动就容易文字拼错。

# 方案思考

我们能不能自动获取权限按钮所处的位置，然后进行自动权限判断呢？位置如何获取呢？是否可以自动provide和inject相关的`权限层`呢？

- 使用指令：指令内部不能获取完整的Vue特性，无法provide和inject，所以不考虑这种实现方式。请查看相关讨论[Provide/inject for custom directives · Issue #6487 · vuejs/vue (github.com)](https://github.com/vuejs/vue/issues/6487)

- 使用装饰器：这个获取到的信息比指令还少，不考虑使用

- 使用父组件包装：这是可以的，但是当权限按钮多的时候，我们每一个按钮和权限层组件都要包装一次父组件，这对于可读性、代码量、重复prop都有不小的负担

- 拦截按钮组件：通过对拦截组件，或者重写组件，注入对应的权限判断逻辑，自动化和控制能力都比较高

为了能自动化权限判断，减小出错可能，我这里采用的是最后一种`拦截组件，注入逻辑`的方案。

# 实现

## 如何判断当前权限所处的位置呢？

考虑到在后台管理中，我们往往有这么几种权限分层场景
- 当前组件所处的**路由地址**(作为权限列表的名称，作为权限第一级区分方式)
- 当前组件所处的**tab名称**(权限层，此时权限路径名称为 'tabName-authText')
- 当前组件所处的**弹窗名称**(权限层，此时权限路径名称为 'dialogTitle-authText')

对于路由地址，我们可以在hooks处理前存储一下当前的静态路由地址(为什么不使用computed来自动获取？这是为了避免路由切换时，keep-alive重复计算)，这里不做详细解释。

对于通用的`权限层`我们我们实现一个hook，来自动`inject`上层的authPath，并继续`provide`当前层的名称。

```tsx
/**
 * @param name - 当前权限层的名称，如：Tab的名称，Dialog的title等
 */
export function useProvideAuth(name?: string) {
  if (!name) return;
  const injectName = inject("auth");

  const provideName = toRef(() =>
    unref(injectName) ? `${unref(injectName)}-${name}` : name
  );

  provide("auth", provideName);
}
```
然后，通过拦截导致权限分层的组件(这里是TabPane和Modal)，我们在`权限层`使用这个hook

1. TabPane权限层

```html
<template>
  <NTabPane :tab="tab" :name="name">
    <slot></slot>
  </NTabPane>
</template>

<script setup lang="ts">
import { useProvideAuth } from "../hooks";
import { NTabPane } from "naive-ui";

defineOptions({
  name: "TabPane",
  // naive-ui: https://github.com/tusen-ai/naive-ui/blob/0839b0ea5e4077e260be4bc3df5d525c35066449/src/tabs/src/Tabs.tsx#L648
  __TAB_PANE__: true,
});
const props = defineProps<{
  auth?: boolean;
  tab: string;
  name: string;
}>();

useProvideAuth(props.tab);
</script>
```

2. Modal权限层
```html
<template>
  <NModal :title="title">
    <slot></slot>
  </NModal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui";
import { useProvideAuth } from "../hooks";

const props = defineProps<{
  auth?: boolean;
  title?: string;
}>();

useProvideAuth(props.title);
</script>

```

这样我们就支持任意层次的`权限层`进行互相嵌套了。

## 如何判断当前权限按钮的文字呢？
我们通过`权限层`能准确地获取当前权限按钮的位置了，那么我们如何才能获取按钮的具体文字呢？

1. 我们这里通过遍历按钮中的slots，判断是否为文字，然后将文字和`权限层`提供的
authPath结合路由名称，即可完全确定一个权限的具体路径了。
2. 我们也可以传入自定义的权限文字，对于特定场景进行定制权限(权限文字和按钮文字表现不一致时)

```tsx
/**
 * 
 * @param auth - 是否进行权限管控
 * @param authText - 自定义权限按钮名称，不通过slot自动获取
 * @returns 
 */
export function useAuth(auth: MaybeRefOrGetter<boolean>, authText?: string) {
  const routeName = "routeNameExample"; // 正常通过useAuth静态传入routeName，避免切换页面时，keep-alive重复计算
  const prevAuthName = inject("auth") as Ref<string> | undefined;
  const slots = useSlots();
  const getSlotChildrenText = (
    children: VNode<
      RendererNode,
      RendererElement,
      {
        [key: string]: any;
      }
    >[]
  ) =>
    children
      .map((node): string => {
        // 这里可能有其他情况，暂时不考虑，需要的自定判断
        if (!node.children || typeof node.children === "string")
          return node.children || "";
        if (typeof (node.children as any).default === "function")
          return getSlotChildrenText((node.children as any).default());
        return "";
      })
      .join("");

  const authValue = toValue(auth);
  const defaultSlots = slots.default?.();
  if (!authText)
    authText = defaultSlots && getSlotChildrenText(defaultSlots).trim();

  const authPath = toRef(() => {
    if (!authText) return;
    return prevAuthName ? `${prevAuthName.value}-${authText}` : authText;
  });
  const show = toRef(
    () =>
      !authValue ||
      !authPath.value ||
      authConfig[routeName]?.includes(authPath.value)
  );

  return {
    show,
    authPath,
  };
}
```

使用这个hook为权限按钮注入判断逻辑，并且我们可以在权限不满足时，提供一些其他的辅助能力，或者提供一些自动化的能力

```html
<template>
  <NButton v-if="show" key="1">
    <slot></slot>
  </NButton>
  <!-- 这里我们通过自定义逻辑和页面，控制权限按钮的其他逻辑，如下：当权限不满足时，显示了一个按钮来复制当前的权限路径-->
  <NButton v-else type="warning" key="2" @click="copyAuthPath">
    复制权限路径
  </NButton>
</template>

<script setup lang="ts">
import { NButton } from "naive-ui";
import { useAuth } from "../hooks";

const props = defineProps<{
  auth?: boolean;
}>();

const { show, authPath } = useAuth(() => props.auth);

const copyAuthPath = () => {
  if (authPath.value) {
    navigator.clipboard.writeText(authPath.value);
  }
};
</script>
```

# 使用

我这里使用的是naive-ui，注册好全局组件后，替换我们重写好的拦截组件
```ts
import { createApp } from "vue";
import App from "./App.vue";
import naive from "naive-ui";
import AuthTabPaneVue from "./components/AuthTabPane.vue";
import AuthButtonVue from "./components/AuthButton.vue";
import AuthModal from "./components/AuthModal.vue";

const app = createApp(App);

app.use(naive);

app.component("n-tab-pane", AuthTabPaneVue);
app.component("n-button", AuthButtonVue);
app.component("n-modal", AuthModal);

app.mount("#app");
```

在业务组件内，我们可以很方便的进行使用
```html
<script setup lang="ts">
import { ref } from "vue";
const showModal = ref(false);
</script>

<template>
  <n-tabs type="line">
    <n-tab-pane name="tab1" tab="第一个Tab">
      <n-button auth> Tab中的按钮权限 </n-button>
    </n-tab-pane>
    <n-tab-pane name="tab2" tab="第二个Tab">
      <n-button @click="showModal = true">显示弹窗</n-button>
      <n-modal
        v-model:show="showModal"
        preset="dialog"
        title="Dialog"
        positive-text="Submit"
        negative-text="Cancel"
      >
        <n-button auth>Tab中Modal中的权限校验</n-button>
        <n-tabs>
          <n-tab-pane name="dialogTabPane" tab="dialog中的TabPane">
            <n-button auth>嵌套的权限</n-button>
          </n-tab-pane>
        </n-tabs>
      </n-modal>
    </n-tab-pane>
  </n-tabs>

  <n-button :auth="true" style="margin-top: 1em">普通的按钮权限</n-button>
</template>
```

如此就自动进行了如下权限判断。可以看业务代码，是非常简洁的，仅仅对需要权限校验的按钮增加了一个auth属性

| 路由名称 | 按钮 | 权限路径 |
| --- | --- | --- |
|  routeNameExample | 普通的按钮权限 | 普通的按钮权限 |
| routeNameExample| Tab中的按钮权限 |第一个Tab-Tab中的按钮权限 |
| routeNameExample| Tab中Modal中的权限校验 |第二个Tab-Dialog-Tab中Modal中的权限校验 |
| routeNameExample| 嵌套的权限 |第二个Tab-Dialog-dialog中的TabPane-嵌套的权限|

我们的配置文件如下：
```ts
export default {
  routeNameExample: [
    "第一个Tab-Tab中的按钮权限",
    "第二个Tab-Dialog-Tab中Modal中的权限校验",
    "普通的按钮权限",
    "第二个Tab-Dialog-dialog中的TabPane-嵌套的权限2",
  ],
};
```
界面展示如下：

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f716f38d3519486fa387e79d8b7f5c43~tplv-k3u1fbpfcp-watermark.image?)

可以看到，按钮都正常显示了，对于没有权限的按钮，显示了一个**复制权限路径**的按钮，这里大家可以自定义其他的逻辑，来实现一些自动化配置。


## 预览地址

此次实现较为简略，可能存在一些问题，这里主要提供的是一种方式，具体业务还需要考虑，如权限控制可能不止有button，还有其他的一些组件。

[codesandbox](https://codesandbox.io/p/github/yuhengshen/vue-auth-layer/main?file=%2Fsrc%2FApp.vue)
