use leptos::prelude::*;
#[allow(unused_imports)]
use oxichrome::{background, extension, log, on, popup};

#[oxichrome::extension(
    name = "Cnmd",
    version = "0.1.0",
    permissions = []
)]
struct Extension;

#[oxichrome::background]
async fn start() {
    oxichrome::log!("Cnmd started!");
}

#[oxichrome::on(runtime::on_installed)]
async fn handle_install(details: oxichrome::__private::wasm_bindgen::JsValue) {
    oxichrome::log!("Cnmd installed: {:?}", details);
}

#[oxichrome::popup]
fn Popup() -> impl IntoView {
    view! {
        <style>{include_str!("popup.css")}</style>
        <div class="cnmd-popup">
            <p class="cnmd-popup-title">"Cnmd"</p>
            <p class="cnmd-popup-desc">
                "在 Chrome 中用「打开文件」打开本地 .md / .markdown 后，本扩展会直接在标签页内渲染 Markdown（与 "
                <a href="https://github.com/md-reader/md-reader" target="_blank" rel="noopener noreferrer">
                    "md-reader"
                </a>
                " 类似）。"
            </p>
            <p class="cnmd-popup-desc cnmd-popup-note">
                "请在 chrome://extensions 中为本扩展开启「允许访问文件网址」。"
            </p>
        </div>
    }
}
