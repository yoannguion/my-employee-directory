// -------------------------------------------------- The Views ---------------------------------------------------- //

directory.views.LinkView = Backbone.View.extend({

    initialize: function () {
        _.bindAll(this);
    },

    events: function() {
    	console.log('directory.views.LinkView :: events');
        var e;
        if (document.documentElement.hasOwnProperty('ontouchstart')) {
            console.log('touch available: registering touchstart');
            e = {
                'touchstart a':             'followLink',
                'click a':                  'cancelClick'
            };
        } else {
            console.log('No touch: registering click');
            e = {
                'click a':             'followLink'
            };
        }
        return e;
    },

    cancelClick: function() {
        return false;
    },

    followLink: function(event) {
        console.log('followLink');
        window.location = $(event.target).attr('href');
    }

});


directory.views.SearchPage = Backbone.View.extend({

    templateLoader: directory.utils.templateLoader,

    initialize: function() {
        console.log('SearchPage initialize');
        this.template = _.template(this.templateLoader.get('search-page'));
        this.render();
    },

    render: function(eventName) {
        console.log('SearchPage render');
        $(this.el).html(this.template(this.model.toJSON()));
        this.listView = new directory.views.EmployeeListView({el: $('.scroll', this.el), model: this.model});
        this.listView.render();
        return this;
    },

    events: {
        "keyup .search-key": "search",
        'touchstart a':  'onClick'
    },

    search: function(event) {
        console.log('search');
        var key = $('.search-key').val();
        this.model.findByName(key);
        return false;
    },

    onClick: function(event) {
        $('.search-key').blur(); // Hide keyboard
    }

});

directory.views.DirectReportPage = Backbone.View.extend({

    initialize: function() {
        this.template = _.template(directory.utils.templateLoader.get('report-page'));
    },

    render: function(eventName) {
        $(this.el).html(this.template(this.model.toJSON()));
        this.listView = new directory.views.EmployeeListView({el: $('.scroll', this.el), model: this.model});
        this.listView.render();
        return this;
    }

});

directory.views.EmployeeListView = Backbone.View.extend({

    initialize: function() {
        this.model.on("reset", this.render, this);
    },

    render: function(eventName) {
        var ul = $('ul', this.el);
        ul.empty();
        _.each(this.model.models, function(employee) {
            ul.append(new directory.views.EmployeeListItemView({model: employee}).render().el);
        }, this);
        if (this.iscroll) {
            console.log('Refresh iScroll');
            this.iscroll.refresh();
        } else {
            console.log('New iScroll');
            this.iscroll = new iScroll(this.el, {hScrollbar: false, vScrollbar: false });
//            setTimeout(function(){
//                self.iscroll = new iScroll(self.el, {hScrollbar: false, vScrollbar: false });
//            }, 1000);
        }
        return this;
    }

});

directory.views.EmployeeListItemView = Backbone.View.extend({

    tagName: "li",

    initialize: function() {
        this.template = _.template(directory.utils.templateLoader.get('employee-list-item'));
    },

    render: function(eventName) {
        $(this.el).html(this.template(this.model.toJSON()));
        var self = this;
        $('<img height="50" width="50" class="list-icon"/>').attr('src', this.model.get('picture'))
            .load(
                function() {
                    $('.imgHolder', self.el).html(this);
                })
            .on('error', function(event) {
                    $(this).attr('src', 'img/unknown.jpg');
                });
        return this;
    }

});

directory.views.EmployeePage = Backbone.View.extend({

    initialize: function() {
        this.template = _.template(directory.utils.templateLoader.get('employee-page'));
    },

    render: function(eventName) {
        $(this.el).html(this.template(this.model.toJSON()));
        var self = this;
        $('<img height="85" width="85" style="border: solid 1px #d5d5d5;"/>').attr('src', this.model.get('picture'))
            .load(
                function() {
                    $('header', self.el).prepend(this);
                })
            .on('error', function(event) {
                    $(this).attr('src', 'img/unknown.jpg');
                });
        setTimeout(function(){
            self.iscroll = new iScroll($('.scroll', self.el)[0], {hScrollbar: false, vScrollbar: false });
            self.iscroll.refresh();
        }, 100);
        return this;
    },


    addContact: function() {
        var contact = new Contact();
        var contactName = new ContactName();
        contactName.givenName = this.model.get('firstName');
        contactName.familyName = this.model.get('lastName');
        contact.name = contactName;
        contact.phoneNumbers = [
            new ContactField('work', this.model.get('officePhone'), false),
            new ContactField('mobile', this.model.get('cellPhone'), true) // preferred number
        ];
        contact.emails = [
            new ContactField('work', this.model.get('email'), true)
        ];
        contact.save();
        showAlert(this.model.get('firstName') + ' ' + this.model.get('lastName') + ' added as Contact', 'Success');
        return false;
    }

});

directory.views.Map = Backbone.View.extend({

    initialize: function() {
        this.template = _.template(directory.utils.templateLoader.get('map'));
    },

    render: function() {
        $(this.el).html(this.template());
        setTimeout(function() {
            var latLng = new google.maps.LatLng(41.4089, -75.6628);
            var myOptions = {
                      center: latLng,
                      zoom: 8,
                      mapTypeId: google.maps.MapTypeId.ROADMAP
                    };
            this.map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
            this.marker = new google.maps.Marker({map: this.map, position: latLng});
        });
        return this;
    }

});

directory.views.SyncPage = Backbone.View.extend({

    initialize: function() {
        this.template = _.template(directory.utils.templateLoader.get('sync-page'));
    },

    events: {
        "touchstart .sync": "sync",
        "touchstart .reset": "reset"
    },

    render: function(eventName) {
        $(this.el).html(this.template());
        var syncURL = window.localStorage.getItem("syncURL");
        if (!syncURL) {
            syncURL = "http://employeedirectory.org/api/employees";
        }
        $('#syncURL', this.el).val(syncURL);
        return this;
    },

    sync: function() {
        window.localStorage.setItem("syncURL", $('#syncURL').val());
        var dao = new directory.dao.EmployeeDAO(directory.db);
        $('#hourglass').show();
        dao.sync(
            function(numItems){
                $('#hourglass').hide();
                showAlert(numItems + ' items synchronized', 'Complete');
                directory.app.searchResults.reset();
            },
            function(errorMessage) {
                $('#hourglass').hide();
                showAlert(errorMessage, "Error");
            });
        return false;
    },

    reset: function() {
        var dao = new directory.dao.EmployeeDAO(directory.db);
        dao.reset(function() {
            showAlert('The local database has been reset', 'Reset');
            directory.app.searchResults.reset();
        });
        return false;
    }

});
