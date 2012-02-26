
(function(){
    var DirectoryView = function(view_elem, model){
        this.m_view_elem = view_elem;
        this.m_model = model;
    };
    DirectoryView.prototype = {
        update: function(){
            this.m_view_elem.innerHTML = this.m_model.repositoryInfo().root_url;
        }
    };


    var load = function(){
        // for test
        var elem = document.getElementById("test");
        elem.addEventListener("click", function(){
            gTestDavSvn.testAll(document.getElementById("output"));
        }, false);

        // view, model
        elem = document.getElementById("tree");
        var model = new DavSvnModel("http://svn.apache.org/repos/asf/subversion");
        model.addListener(new DirectoryView(elem, model));
    };

    window.addEventListener("load", load, false);
})();

