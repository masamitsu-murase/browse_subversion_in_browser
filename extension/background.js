(function(){
    // event handler of icon clicking
    chrome.browserAction.onClicked.addListener(function(tab){
        chrome.tabs.create({ url: "repository_view/repository_view.html" });
    });
})();
