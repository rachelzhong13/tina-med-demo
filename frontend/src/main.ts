import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "@fontsource-variable/noto-serif-sc/wght.css";
import "./style.css";

createApp(App).use(router).mount("#app");
