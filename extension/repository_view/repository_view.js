
(function(){
    var load = function(){
        var elem = document.getElementById("test");
        elem.addEventListener("click", function(){
            gTestDavSvn.testAll();
        }, false);

        elem = document.getElementById("show_files");
        elem.addEventListener("click", function(){
            var output = document.getElementById("output");
            gDavSvn.fileList("http://svn.apache.org/repos/asf/", 10000, function(obj){
                if (!(obj.ret)){
                    output.innerHTML = "NG";
                    return;
                }

                var str = obj.file_list.map(function(item){ return item.type + ": " + item.name; }).join("<br />");
                output.innerHTML = str;
            });
        }, false);
    };

    window.addEventListener("load", load, false);
})();

