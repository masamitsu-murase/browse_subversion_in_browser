
var DavSvnResource = function(name, type, info){
    this.m_type = type;
    switch(type){
      case DavSvnResource.TYPE_DIRECTORY:
        this.m_dir_state = DavSvnResource.DIR_CLOSED;
        break;
      default:
        break;
    }
    this.m_state = DavSvnResource.STATE_NOT_LOADED;
    this.m_name = name;
    this.m_children = {};
    this.m_parent = null;
    this.m_info = (info || {});
};
DavSvnResource.prototype = {
    type: function(){ return this.m_type; },
    name: function(){ return this.m_name; },
    state: function(){ return this.m_state; },
    setState: function(state){ this.m_state = state; },

    dirIsOpened: function(){
        if (this.m_type != DavSvnResource.TYPE_DIRECTORY){
            throw "dirIsOpened error";
        }
        return this.m_dir_state == DavSvnResource.DIR_OPENED;
    },
    dirIsClosed: function(){
        if (this.m_type != DavSvnResource.TYPE_DIRECTORY){
            throw "dirIsClosed error";
        }
        return this.m_dir_state == DavSvnResource.DIR_CLOSED;
    },
    setDirState: function(state){
        if (this.m_type != DavSvnResource.TYPE_DIRECTORY){
            throw "setDirState error";
        }
        var changed = (this.m_dir_state != state);
        this.m_dir_state = state;
        return changed;
    },
    dirOpen: function(){
        return this.setDirState(DavSvnResource.DIR_OPENED);
    },
    dirClose: function(){
        return this.setDirState(DavSvnResource.DIR_CLOSED);
    },

    isRoot: function(){
        return (this.name() === "" && this.isDirectory());
    },
    isDirectory: function(){
        return this.type() == DavSvnResource.TYPE_DIRECTORY;
    },
    isFile: function(){
        return this.type() == DavSvnResource.TYPE_FILE;
    },
    isUnknown: function(){
        return this.type() == DavSvnResource.TYPE_UNKNOWN;
    },

    addChild: function(child){
        var name = child.name();
        this.m_children[name] = child;
        child.setParent(this);
    },
    children: function(){
        var keys = [];
        for (var k in this.m_children){
            keys.push(k);
        }
        keys.sort();
        return keys.map(function(k){ return this.m_children[k]; }, this);
    },
    childDirs: function(){
        return this.children().filter(function(child){ return child.isDirectory(); });
    },
    childFiles: function(){
        return this.children().filter(function(child){ return child.isFile(); });
    },
    hasChild: function(name){
        return this.m_children[name] != null;
    },
    findChild: function(name){
        return this.m_children[name];
    },
    parent: function(){ return this.m_parent; },
    setParent: function(parent){
        this.m_parent = parent;
    },

    path: function(){
        var path = this.name();
        var resource = this.parent();
        while(resource && !(resource.isRoot())){
            path = resource.name() + "/" + path;
            resource = resource.parent();
        }
        return path;
    },

    markNotLoaded: function(){
        this.m_children = {};
        this.m_state = DavSvnResource.STATE_NOT_LOADED;
    },
    markLoading: function(){
        this.m_children = {};
        this.m_state = DavSvnResource.STATE_LOADING;
    },
    markLoaded: function(){
        this.m_state = DavSvnResource.STATE_LOADED;
    },
    isLoaded: function(){
        return this.m_state == DavSvnResource.STATE_LOADED;
    },

    debugInfo: function(level){
        level = (level || 0);
        var space = "";
        for (var i=0; i<level; i++){
            space += "    ";
        }
        var str = space + this.name() + ": " + (this.type()==DavSvnResource.TYPE_FILE ? "file" : "dir");
        var keys = [];
        for (var k in this.m_children){
            keys.push(k);
        }
        keys.sort();
        str += "\n" + keys.map(function(k){ return this.m_children[k].debugInfo(level + 1); }, this).join("\n");
        return str;
    }
};
DavSvnResource.TYPE_UNKNOWN = 1;
DavSvnResource.TYPE_FILE = 2;
DavSvnResource.TYPE_DIRECTORY = 3;
DavSvnResource.DIR_OPENED = 1;
DavSvnResource.DIR_CLOSED = 2;
DavSvnResource.STATE_LOADING = 1;
DavSvnResource.STATE_LOADED = 2;
DavSvnResource.STATE_NOT_LOADED = 3;


var DavSvnModel = function(url, revision){
    this.m_peg_revision = (revision || "HEAD");
    this.m_operation_revision = (revision || "HEAD");
    this.m_root_url = null;
    this.m_current_path = null;
    this.m_listeners = [];
    this.m_root_dir = null;

    // initialize
    var self = this;
    gDavSvn.rootUrl(url, function(obj){
        if (!(obj.ret)){
            return;
        }

        self.m_root_url = obj.root_url;
        self.m_current_path = obj.path;
        self.reloadPath(obj.path);
    });
};
DavSvnModel.prototype = {
    addListener: function(listener){
        this.m_listeners.push(listener);
    },
    notify: function(){
        this.m_listeners.forEach(function(listener){
            listener.update();
        });
    },

    pegRevision: function(){ return this.m_peg_revision; },
    operationRevision: function(){ return this.m_operation_revision; },

    repositoryInfo: function(){
        return {
            uuid: "not implemented yet",
            root_url: this.m_root_url
        };
    },

    // Reload specified path.
    // Directory state (opened/closed) is kept.
    reloadPath: function(path){
        var self = this;

        // First, replace current resource.
        var target = this.resource(path);
        if (!target){
            target = new DavSvnResource(path.split("/").pop(), DavSvnResource.TYPE_UNKNOWN);
            this.setResource(path, target);
        }
        target.markLoading();
        this.notify();

        // Then, reload current resource and children.
        gDavSvn.fileList(this.m_root_url + path, this.m_peg_revision, function(obj){
            if (!(obj.ret)){
                target.markNotLoaded();
                self.notify();
                return;
            }

            // add files
            var target_info = obj.file_list.shift();
            var target_resource = new DavSvnResource(target_info.path.split("/").pop(),
                                                     (target_info.type == "file" ? DavSvnResource.TYPE_FILE
                                                      : DavSvnResource.TYPE_DIRECTORY));
            obj.file_list.forEach(function(file){
                var child = new DavSvnResource(file.path.split("/").pop(),
                                               (file.type == "file" ? DavSvnResource.TYPE_FILE
                                                : DavSvnResource.TYPE_DIRECTORY));
                target_resource.addChild(child);
            });
            target_resource.markLoaded();
            self.setResource(target_info.path, target_resource);
            if (target.isDirectory() && target_resource.isDirectory()){
                if (target.dirIsOpened()){
                    target_resource.dirOpen();
                }else{
                    target_resource.dirClose();
                }
            }else if (target.isUnknown() && target_resource.isDirectory()){
                // first loading
                target_resource.dirOpen();
            }
            self.notify();
        });
    },
    changePath: function(path){
    },

    // Directory operation
    openDirectory: function(path, no_notify){
        var resource = this.resource(path);
        if (!resource || !resource.isDirectory()){
            return;
        }
        var changed = resource.dirOpen();
        if (changed && !no_notify){
            this.notify();
        }
    },
    closeDirectory: function(path, no_notify){
        var resource = this.resource(path);
        if (!resource || !resource.isDirectory()){
            return;
        }
        var changed = resource.dirClose();
        if (changed && !no_notify){
            this.notify();
        }
    },
    toggleDirectory: function(path, no_notify){
        var resource = this.resource(path);
        if (!resource || !resource.isDirectory()){
            return;
        }

        if (resource.dirIsOpened()){
            this.closeDirectory(path, no_notify);
        }else{
            this.openDirectory(path, no_notify);
        }
    },

    // Resource
    setResource: function(path, resource){
        if (path === ""){
            this.m_root_dir = resource;
            return;
        }

        this.m_root_dir = (this.m_root_dir || new DavSvnResource("", DavSvnResource.TYPE_DIRECTORY));

        var dir = this.m_root_dir;
        var paths = path.split("/");
        paths.pop();
        paths.forEach(function(name){
            if (dir.hasChild(name)){
                dir = dir.findChild(name);
            }else{
                var new_dir = new DavSvnResource(name, DavSvnResource.TYPE_DIRECTORY);
                dir.addChild(new_dir);
                dir.dirOpen();
                dir = new_dir;
            }
        });
        dir.addChild(resource);
        dir.dirOpen();
    },
    resource: function(path){
        if (!this.m_root_dir){
            // Not initialized yet.
            return null;
        }

        if (path === "" || !path){
            // this means root.
            return this.m_root_dir;
        }

        var paths = path.split("/");
        var dir = this.m_root_dir;
        for (var i=0; i<paths.length; i++){
            var name = paths[i];
            if (dir.hasChild(name)){
                dir = dir.findChild(name);
            }else{
                return null;
            }
        }
        return dir;
    },

    setRevision: function(revision){
        this.m_root_dir = null;
        this.m_peg_revision = revision;
        this.m_operation_revision = revision;
        this.reloadPath("");
    }
};

