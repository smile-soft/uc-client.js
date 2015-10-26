var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    notify = require('gulp-notify');

gulp.task('build', function(){
    return gulp.src('UCClient.js')
	.pipe(jshint())
	.pipe(jshint.reporter('default'))
	.pipe(gulp.dest('example/js'))
	.pipe(concat('UCClient.min.js'))
	.pipe(uglify())
	.pipe(gulp.dest('./'))
	.pipe(notify({ message: "Build task complete" }));
});
