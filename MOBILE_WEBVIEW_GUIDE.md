# Mobile App WebView Camera Integration Guide / APP 整合相機功能指南

若您的 Tour Master 是以「原生 APP 包覆網頁 (WebView)」的形式發布，請將此文件提供給您的 APP 開發人員 (Android / iOS 工程師)。

網頁端已設定標準的 `<input type="file" capture="environment">`，但 APP 端必須配合以下設定，才能正確喚起相機而非檔案總管。

---

## 🤖 Android (Kotlin/Java)

Android 的 WebView 預設不會自動處理檔案上傳與相機請求，必須手動實作 `WebChromeClient`。

### 1. 權限宣告 (`AndroidManifest.xml`)
請確保已加入相機與儲存權限：
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- Android 11+ 建議加入 -->
<queries>
    <intent>
        <action android:name="android.media.action.IMAGE_CAPTURE" />
    </intent>
</queries>
```

### 2. 實作 WebChromeClient (`MainActivity.java` 或對應 WebView Activity)
這是最關鍵的部分。請在您的 WebView 設定中複寫 `onShowFileChooser`。

```java
webView.setWebChromeClient(new WebChromeClient() {
    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
        // 檢查是否包含 "capture" 屬性 (網頁端已設定 capture="environment")
        if (fileChooserParams.isCaptureEnabled()) {
            // 這裡必須建立開啟相機的 Intent
            Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
                // 建立暫存檔案 Uri (需配合 FileProvider)
                // File photoFile = createIdImageFile();
                // Uri photoURI = FileProvider.getUriForFile(this, "com.example.android.fileprovider", photoFile);
                // takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                
                // 啟動相機
                startActivityForResult(takePictureIntent, REQUEST_IMAGE_CAPTURE);
                
                // 重要：保存 filePathCallback 以便在 onActivityResult 回傳 Uri
                mUploadCallback = filePathCallback; 
                return true;
            }
        }
        
        // 若沒有 capture 屬性，則開啟一般檔案選擇器
        // ...
        return false;
    }
});
```

---

## 🍎 iOS (Swift/Objective-C)

iOS 的 `WKWebView` 支援度較好，通常只需要在隱私權設定中宣告用途即可。

### 1. 隱私權設定 (`Info.plist`)
若未設定此項目，APP 嘗試開啟相機時會直接閃退。

| Key | Value (說明文字) |
|-----|-----------------|
| `NSCameraUsageDescription` | 需要使用相機拍攝登機證或護照以便上傳 |
| `NSPhotoLibraryUsageDescription` | 需要存取相簿以上傳證件照片 |

### 2. WKWebView 設定
確保允許媒體播放與互動（通常預設即可，但可檢查以下屬性）：
```swift
let webConfiguration = WKWebViewConfiguration()
webConfiguration.allowsInlineMediaPlayback = true
// 確保沒有設定為 false
// webConfiguration.mediaTypesRequiringUserActionForPlayback = .all
```

---

## 🌐 網頁端設定 (已完成)

我們已經在 `src/app/groups/[id]/airport/page.tsx` 完成了相容性優化：

```tsx
<input 
  type="file" 
  accept="image/*" 
  capture="environment" // 指定優先使用後鏡頭
  className="absolute opacity-0 w-1 h-1 overflow-hidden" // 避免 display:none 導致舊版 WebView 忽略
  onChange={handleFileChange}
/>
```

此設定能確保：
1. 在 iOS Safari / Android Chrome 瀏覽器中：直接跳出相機/相簿選項。
2. 在已正確設定的 WebView APP 中：優先開啟相機。
