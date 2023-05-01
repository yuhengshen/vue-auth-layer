import {
  MaybeRefOrGetter,
  Ref,
  RendererElement,
  RendererNode,
  VNode,
  computed,
  inject,
  provide,
  ref,
  unref,
  useSlots,
  toValue,
  toRef,
} from "vue";
import authConfig from "../data/auth";

/**
 *
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
