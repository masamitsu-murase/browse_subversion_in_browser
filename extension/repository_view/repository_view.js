
(function(){
    var DirectoryView = function(view_elem, model){
        this.m_view_elem = view_elem;
        this.m_root_div = this.createRootDiv();
        this.m_view_elem.appendChild(this.m_root_div);
        this.m_model = model;
    };
    DirectoryView.prototype = {
        update: function(){
            this.updateTreeView();
        },

        updateTreeView: function(){
            var root_div = this.m_root_div;

            // remove current children
            var children = root_div.childNodes;
            for (var i=0; i<children.length; i++){
                root_div.removeChild(children[i]);
            }

            // append new child
            var dir = this.m_model.resource("");
            root_div.appendChild(this.createResourceNode(dir));
        },

        createRootDiv: function(){
            var elem = document.createElement("div");
            elem.className = DirectoryView.CLASS_ROOT_DIV;
            return elem;
        },

        createResourceNode: function(dir){
            var elem = document.createElement("ul");

            // Information of this element
            var li_info = document.createElement("li");
            li_info.className = DirectoryView.CLASS_INFO_LI;
            elem.appendChild(li_info);

            var span_name = document.createElement("span");
            if (dir.isRoot()){
                span_name.appendChild(document.createTextNode(this.m_model.repositoryInfo().root_url));
            }else{
                span_name.appendChild(document.createTextNode(dir.name()));
            }
            li_info.appendChild(span_name);
            var path = dir.path();
            var self = this;
            span_name.addEventListener("click", function(){
                self.m_model.reloadPath(path);
            });

            if (dir.isDirectory()){
                // Information of children
                var li_children = document.createElement("li");
                li_children.className = DirectoryView.CLASS_CHILDREN_LI;
                elem.appendChild(li_children);

                var ul_children = document.createElement("ul");
                li_children.appendChild(ul_children);

                dir.childDirs().concat(dir.childFiles()).forEach(function(child){
                    var li = document.createElement("li");
                    ul_children.appendChild(li);
                    li.appendChild(this.createResourceNode(child));
                }, this);
            }

            return elem;
        }
    };
    DirectoryView.CLASS_ROOT_DIV = "svn_root";
    DirectoryView.CLASS_INFO_LI = "svn_info";
    DirectoryView.CLASS_CHILDREN_LI = "svn_children";


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

