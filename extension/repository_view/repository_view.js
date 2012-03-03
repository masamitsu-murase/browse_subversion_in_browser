
(function(){
    var DirectoryView = function(view_elem, model){
        this.m_view_elem = view_elem;
        this.m_model = model;
    };
    DirectoryView.prototype = {
        update: function(){
            this.m_view_elem.innerHTML = this.m_model.m_root_dir.debugInfo();
        }
    };


    var load = function(){
        // for test
        var elem = document.getElementById("test");
        elem.addEventListener("click", function(){
            gTestDavSvn.testAll(document.getElementById("output"));
        }, false);

        // view, model
        elem = document.getElementById("output");
        var model = new DavSvnModel("http://svn.apache.org/repos/asf/subversion", 1000000);
        model.addListener(new DirectoryView(elem, model));

        /// test
        document.getElementById("show_files").addEventListener("click", function(){
            var path = document.getElementById("path").value;
            model.reloadPath(path);
        }, false);
    };

    window.addEventListener("load", load, false);
})();

