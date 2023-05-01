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
