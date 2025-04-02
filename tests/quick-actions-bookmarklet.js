/**
 * Quick Actions Fix - Bookmarklet
 * 
 * This script provides a bookmarklet that can be dragged to your browser's bookmarks bar
 * to quickly apply the Quick Actions fix on any page of the AI Lawyer application.
 * 
 * How to use:
 * 1. Create a new bookmark in your browser
 * 2. Give it a name like "Fix Quick Actions"
 * 3. Paste the BOOKMARKLET_CODE below as the URL
 * 4. Navigate to the AI Lawyer application
 * 5. Click the bookmark to apply the fix
 */

// This is the code you should put in your bookmark
const BOOKMARKLET_CODE = `javascript:(function(){
  // Load the fix script
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/YOUR_REPO/quick-actions-fix.js';
  script.onload = function() {
    // Apply the fix when the script is loaded
    window.fixQuickActions();
    window.createQuickActionsDebugUI();
  };
  document.head.appendChild(script);
  
  // Fallback if the external script can't be loaded
  setTimeout(function() {
    if (!window.fixQuickActions) {
      console.log('Loading fix script inline...');
      
      // Copy the entire content of quick-actions-fix.js here as a fallback
      // This is the minified version of the fix script
      ${getMinifiedFixScript()}
      
      // Apply the fix
      window.fixQuickActions();
      window.createQuickActionsDebugUI();
    }
  }, 2000);
})();`;

// Helper function to get a minified version of the fix script
function getMinifiedFixScript() {
  return `
  window.fixQuickActions=function(){console.log("🔧 Applying Quick Actions fix...");function e(e,t){const n=Array.from(document.querySelectorAll("[data-reactroot]")).map(e=>e._reactRootContainer?._internalRoot?.current),o=[];try{const e=Object.keys(document).find(e=>e.startsWith("__reactContainer$")||e.startsWith("__reactFiber$")||e.startsWith("__reactProps$"));if(e){const t=e.replace(/\$.*$/,"$");Array.from(document.querySelectorAll("*")).forEach(e=>{const n=Object.keys(e),o=n.find(e=>e.startsWith(t));o&&e[o]&&o.push(e[o])})}}catch(e){console.error("Error finding React 18+ fiber nodes:",e)}const r=[...n,...o].filter(Boolean),i=[],l=new Set;function c(e){if(e&&!l.has(e)){l.add(e);try{const n=e.type?.displayName||e.type?.name;n&&(!t||n.match(t))&&i.push({name:n,fiber:e,stateNode:e.stateNode,props:e.memoizedProps,state:e.memoizedState})}catch(e){}e.child&&c(e.child),e.sibling&&c(e.sibling),e.return&&c(e.return)}}return r.forEach(e=>c(e)),i}function t(){try{const t=e(document.body,/AILawyerPage/);if(console.log("Found AI Lawyer components:",t.length),t.length>0){const e=t[0],n=e.props||{};if(n.setSidebarOpen)return n.setSidebarOpen(!0),console.log("Forced sidebar open via props"),!0;if(e.stateNode&&"function"==typeof e.stateNode.setState)return e.stateNode.setState(e=>({...e,sidebarOpen:!0})),console.log("Forced sidebar open via setState"),!0}return sessionStorage.setItem("FORCE_SIDEBAR_OPEN","true"),!1}catch(e){return console.error("Error forcing sidebar open:",e),!1}}function n(){try{const t=e(document.body,/AILawyerPage/);if(0===t.length)return console.error("No AILawyerPage components found"),!1;const n=t[0],o=n.props||{},r=n.state||{};let i=o.toggleDocumentSelection,l=o.handleQuickAction,c=o.selectedFiles||[],s=o.clientFiles||[];return i||(n.stateNode&&(i=n.stateNode.toggleDocumentSelection,l=n.stateNode.handleQuickAction,c=n.stateNode.state?.selectedFiles||[],s=n.stateNode.state?.clientFiles||[])),i?(window.toggleDocumentSelection=i,console.log("✅ Exposed toggleDocumentSelection function")):console.error("❌ Could not find toggleDocumentSelection function"),l?(window.handleQuickAction=l,console.log("✅ Exposed handleQuickAction function")):console.error("❌ Could not find handleQuickAction function"),window.getSelectedDocuments=()=>c,window.getClientFiles=()=>s,window.selectFirstDocument=()=>{const e=window.getClientFiles();if(e&&e.length>0){const t=e[0],n="string"==typeof t?t:t.id;return console.log("Selecting first document:",n),window.toggleDocumentSelection(n),n}return console.error("No client files found to select"),null},window.checkSessionStorage=()=>{try{const e=JSON.parse(sessionStorage.getItem("SELECTED_FILES")||"[]");return console.log("Selected files in session storage:",e),e}catch(e){return console.error("Error checking session storage:",e),[]}},!0}catch(e){return console.error("Error exposing document functions:",e),!1}}function o(){const e=document.getElementById("quick-actions-helper");e&&e.remove();const t=document.createElement("div");t.id="quick-actions-helper",t.style.position="fixed",t.style.bottom="20px",t.style.right="20px",t.style.backgroundColor="#f9f9f9",t.style.border="1px solid #ccc",t.style.borderRadius="5px",t.style.padding="10px",t.style.zIndex="9999",t.style.maxWidth="300px",t.style.boxShadow="0 2px 10px rgba(0,0,0,0.2)";const o=document.createElement("h3");function r(e,t,n="#0066cc"){const o=document.createElement("button");return o.textContent=e,o.style.backgroundColor=n,o.style.color="white",o.style.border="none",o.style.borderRadius="4px",o.style.padding="5px",o.style.cursor="pointer",o.style.fontSize="12px",o.onclick=t,o}o.textContent="Quick Actions Helper",o.style.margin="0 0 10px 0",o.style.fontSize="14px",o.style.borderBottom="1px solid #eee",o.style.paddingBottom="5px",t.appendChild(o);const i=document.createElement("div");i.style.fontSize="12px",i.style.marginBottom="10px",t.appendChild(i);const l=document.createElement("div");function c(){const e=window.getSelectedDocuments()||[],t=window.getClientFiles()||[];i.innerHTML=`
        <div>Client Files: ${t.length}</div>
        <div>Selected Files: ${e.length}</div>
        ${e.length>0?`<div>Selected IDs: ${e.map(e=>"string"==typeof e?e:e.id).join(", ")}</div>`:"<div>No files selected</div>"}
      `}l.style.display="grid",l.style.gridTemplateColumns="1fr 1fr",l.style.gap="5px",t.appendChild(l),l.appendChild(r("Force Sidebar Open",()=>{t(),c()})),l.appendChild(r("Select First Doc",()=>{window.selectFirstDocument(),c()})),l.appendChild(r("Extract Dates",()=>{window.handleQuickAction("Extract Dates")},"#28a745")),l.appendChild(r("Summarize",()=>{window.handleQuickAction("Summarize Document")},"#28a745"));const s=document.createElement("button");return s.textContent="×",s.style.position="absolute",s.style.top="5px",s.style.right="5px",s.style.backgroundColor="transparent",s.style.border="none",s.style.fontSize="16px",s.style.cursor="pointer",s.onclick=()=>t.remove(),t.appendChild(s),c(),document.body.appendChild(t),c}return t(),n(),window.createQuickActionsDebugUI=o,console.log("✅ Quick Actions fix applied successfully"),console.log("📌 You can now use:"),console.log("- window.toggleDocumentSelection(fileId)"),console.log("- window.handleQuickAction(\"Extract Dates\")"),console.log("- window.selectFirstDocument()"),console.log("- window.createQuickActionsDebugUI()"),!0};
  `;
}

/**
 * Quick Copy Script for Console Use
 * 
 * This is a simplified version of the fix that can be directly copied
 * and pasted into the browser console.
 */
const CONSOLE_CODE = `
// Load and apply Quick Actions fix
const script = document.createElement('script');
script.src = 'path/to/your/quick-actions-fix.js';
script.onload = function() {
  window.fixQuickActions();
  window.createQuickActionsDebugUI();
};
document.head.appendChild(script);

// Or just copy the full script content from quick-actions-fix.js and run:
// window.fixQuickActions();
// window.createQuickActionsDebugUI();
`;

/**
 * Guidance for Developers
 * 
 * 1. The most reliable method is to include the fix script directly in your application:
 *    - Add the quick-actions-fix.js file to your project
 *    - Import it in your main application file or bundle
 *    - Call window.fixQuickActions() when the app is loaded
 * 
 * 2. For testing and debugging, open your console and run:
 *    - Copy and paste the entire content of quick-actions-fix.js
 *    - Run window.fixQuickActions()
 *    - Run window.createQuickActionsDebugUI() to show the debug panel
 * 
 * 3. To apply the fix permanently, consider modifying the AILawyerPageNew.tsx file:
 *    - Fix the conditional rendering of the document selection UI
 *    - Ensure the sidebar is properly opened when documents are available
 *    - Make the document selection functions accessible to the Quick Actions
 */ 