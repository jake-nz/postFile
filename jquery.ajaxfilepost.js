(function( jQuery ) {
    
var rnoContent = /^(?:GET|HEAD|DELETE)$/,
    rhash = /#.*$/;
        
jQuery.extend({
        // triggerGlobal, handleSuccess, handleComplete doesn't exist yet...
        triggerGlobal: function( s, type, args ) {
		(s.context && s.context.url == null ? jQuery(s.context) : jQuery.event).trigger(type, args);
	},
        handleSuccess: function( s, xhr, status, data ) {
		// If a local callback was specified, fire it and pass it the data
		if ( s.success ) {
			s.success.call( s.context, data, status, xhr );
		}

		// Fire the global callback
		if ( s.global ) {
			jQuery.triggerGlobal( s, "ajaxSuccess", [xhr, s] );
		}
	},
        handleComplete: function( s, xhr, status ) {
		// Process result
		if ( s.complete ) {
			s.complete.call( s.context, xhr, status );
		}

		// The request was completed
		if ( s.global ) {
			jQuery.triggerGlobal( s, "ajaxComplete", [xhr, s] );
		}

		// Handle the global AJAX counter
		if ( s.global && jQuery.active-- === 1 ) {
			jQuery.event.trigger( "ajaxStop" );
		}
	},
    	handleUploadProgress: function( s, xhr, complete, rpe ) {
		// If a local callback was specified, fire it
		if ( s.progress ) {
			s.progress.call( s.context, xhr, complete, rpe );
		}

		// Fire the global callback
		if ( s.global ) {
			jQuery.triggerGlobal( s, "ajaxProgress", [xhr, s, rpe] );
		}
	},
	postFile: function( origSettings ) {
		var s = jQuery.extend(true, {}, jQuery.ajaxSettings, origSettings),
			status, data, type = s.type.toUpperCase(), noContent = rnoContent.test(type);

		s.url = s.url.replace( rhash, "" );

		// Use original (not extended) context object if it was provided
		s.context = origSettings && origSettings.context != null ? origSettings.context : s;

		// Watch for a new set of requests
		if ( s.global && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		var requestDone = false;

		// Create the request object
		var xhr = s.xhr();

		if ( !xhr ) {
			return;
		}
                
                // process file and data
                if (window.FormData) {//Many thanks to scottt.tw
                    var data = new FormData();
                    data.append(s.fileFieldName, s.file);
                    $.each(s.data, function(k,v){
                        data.append(k,v);
                    })
                    s.data = data;
                }
                else if (s.file.getAsBinary) {//Thanks to jm.schelcher
                    var boundary = '------multipartformboundary' + (new Date).getTime();
                    var dashdash = '--';
                    var crlf     = '\r\n';
    
                    /* Build RFC2388 string. */
                    var raw_form = '';
                    
                    $.each(s.data, function(k,v){
                        raw_form += dashdash + boundary + crlf;
                        raw_form += 'Content-Disposition: form-data; name="'+k+'"' + crlf;
                        raw_form += crlf;
                        raw_form += v + crlf;
                    })
    
                    raw_form += dashdash + boundary + crlf;
    
                    raw_form += 'Content-Disposition: form-data; name="'+s.fileFieldName+'"';
                    raw_form += '; filename="' + s.file.fileName + '"';
                    raw_form += crlf;
    
                    raw_form += 'Content-Type: application/octet-stream';
                    raw_form += crlf;
                    raw_form += crlf;
    
                    /* Append binary data. */
                    raw_form += s.file.getAsBinary();
                    raw_form += crlf;
    
                    /* Write boundary. */
                    raw_form += dashdash;
                    raw_form += boundary;
                    raw_form += dashdash;
                    raw_form += crlf;
    
                    s.data = raw_form;
                }

		// Open the socket
		// Passing null username, generates a login popup on Opera (#2865)
		if ( s.username ) {
			xhr.open('post', s.url, s.async, s.username, s.password);
		} else {
			xhr.open('post', s.url, s.async);
		}

		// Need an extra try/catch for cross domain requests in Firefox 3
		try {
			// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
			if ( s.ifModified ) {
				if ( jQuery.lastModified[s.url] ) {
					xhr.setRequestHeader("If-Modified-Since", jQuery.lastModified[s.url]);
				}

				if ( jQuery.etag[s.url] ) {
					xhr.setRequestHeader("If-None-Match", jQuery.etag[s.url]);
				}
			}

                        xhr.setRequestHeader("Cache-Control", "no-cache");
                        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                        xhr.setRequestHeader("X-File-Name", s.file.fileName);
                        xhr.setRequestHeader("X-File-Size", s.file.fileSize);

			// Set the Accepts header for the server, depending on the dataType
			xhr.setRequestHeader("Accept", s.dataType && s.accepts[ s.dataType ] ?
				s.accepts[ s.dataType ] + ", */*; q=0.01" :
				s.accepts._default );
		} catch( headerError ) {}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && s.beforeSend.call(s.context, xhr, s) === false ) {
			// Handle the global AJAX counter
			if ( s.global && jQuery.active-- === 1 ) {
				jQuery.event.trigger( "ajaxStop" );
			}

			// close opended socket
			xhr.abort();
			return false;
		}

		if ( s.global ) {
			jQuery.triggerGlobal( s, "ajaxSend", [xhr, s] );
		}

                //add progress callback
                var onprogress = xhr.upload['onprogress'] = function(rpe) {
                    jQuery.handleComplete( s, xhr, Math.ceil(rpe.loaded*100 / rpe.total), rpe );
                };
		// Wait for a response to come back
		var onreadystatechange = xhr.onreadystatechange = function( isTimeout ) {
			// The request was aborted
			if ( !xhr || xhr.readyState === 0 || isTimeout === "abort" ) {
				// Opera doesn't call onreadystatechange before this point
				// so we simulate the call
				if ( !requestDone ) {
					jQuery.handleComplete( s, xhr, status, data );
				}

				requestDone = true;
				if ( xhr ) {
					xhr.onreadystatechange = jQuery.noop;
				}

			// The transfer is complete and the data is available, or the request timed out
			} else if ( !requestDone && xhr && (xhr.readyState === 4 || isTimeout === "timeout") ) {
				requestDone = true;
				xhr.onreadystatechange = jQuery.noop;

				status = isTimeout === "timeout" ?
					"timeout" :
					!jQuery.httpSuccess( xhr ) ?
						"error" :
						s.ifModified && jQuery.httpNotModified( xhr, s.url ) ?
							"notmodified" :
							"success";

				var errMsg;

				if ( status === "success" ) {
					// Watch for, and catch, XML document parse errors
					try {
						// process the data (runs the xml through httpData regardless of callback)
						data = jQuery.httpData( xhr, s.dataType, s );
					} catch( parserError ) {
						status = "parsererror";
						errMsg = parserError;
					}
				}

				// Make sure that the request was successful or notmodified
				if ( status === "success" || status === "notmodified" ) {
					jQuery.handleSuccess( s, xhr, status, data );
				} else {
					jQuery.handleError( s, xhr, status, errMsg );
				}

				// Fire the complete handlers
				jQuery.handleComplete( s, xhr, status, data );

				if ( isTimeout === "timeout" ) {
					xhr.abort();
				}

				// Stop memory leaks
				if ( s.async ) {
					xhr = null;
				}
			}
		};

		// Override the abort handler, if we can (IE 6 doesn't allow it, but that's OK)
		// Opera doesn't fire onreadystatechange at all on abort
		try {
			var oldAbort = xhr.abort;
			xhr.abort = function() {
				// xhr.abort in IE7 is not a native JS function
				// and does not have a call property
				if ( xhr && oldAbort.call ) {
					oldAbort.call( xhr );
				}

				onreadystatechange( "abort" );
			};
		} catch( abortError ) {}

		// Timeout checker
		if ( s.async && s.timeout > 0 ) {
			setTimeout(function() {
				// Check to see if the request is still happening
				if ( xhr && !requestDone ) {
					onreadystatechange( "timeout" );
				}
			}, s.timeout);
		}

		// Send the data
		try {
                        if( jQuery.isFunction( s.data.append ) ){
                            xhr.send( noContent || s.data == null ? null : s.data );
                        }else{
                            xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' + boundary);
                            xhr.sendAsBinary(s.data);
                        }

		} catch( sendError ) {
			jQuery.handleError( s, xhr, null, sendError );

			// Fire the complete handlers
			jQuery.handleComplete( s, xhr, status, data );
		}

		// firefox 1.5 doesn't fire statechange for sync requests
		if ( !s.async ) {
			onreadystatechange();
		}

		// return XMLHttpRequest to allow aborting the request etc.
		return xhr;
	}
});

})( jQuery );