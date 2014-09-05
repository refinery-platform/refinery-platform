from django.conf import settings
from django.core.urlresolvers import reverse
from django.forms import Form
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt

from resumable.fields import ResumableFileField
from resumable.views import ResumableUploadView


class ResumableForm(Form):
    file = ResumableFileField(
#         allowed_mimes=("audio/ogg",),
        upload_url=lambda: reverse('upload'),
        chunks_dir=getattr(settings, 'FILE_UPLOAD_TEMP_DIR')
    )


class MyResumableUploadView(ResumableUploadView):
    def get(self, *args, **kwargs):
        if self.request.is_ajax():
            return ResumableUploadView.get(self, *args, **kwargs)
        form = ResumableForm()
        return render(self.request, 'file_store/upload.html', {'form': form})
#     @property
#     def chunks_dir(self):
#         return self.request.user.profile.chunks_dir

    @csrf_exempt
    def dispatch(self, *args, **kwargs):
        return super(MyResumableUploadView, self).dispatch(*args, **kwargs)
