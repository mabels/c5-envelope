import os
import setuptools
import sys
import json
from shutil import copyfile
from setuptools.command.install import install



def read(fname):
  with open(os.path.join(os.path.dirname(__file__), fname), 'rt') as f:
    return f.read()


def write_init():
  with open("./lang/python/__init__.py", "w") as init_file:
    print("# generated", file=init_file)
    print("from .envelope import *", file=init_file)
    print("from .simple_envelope import *", file=init_file)
    print("if __name__ == '__main__':", file=init_file)
    print(" print('ready to format a c5 envelope')", file=init_file)

class PreInstallCommand(install):
    """Pre-installation for installation mode."""
    def run(self):
        write_init()
        copyfile('./src/simple_envelope.py', './lang/python/simple_envelope.py')
        install.run(self)


setuptools.setup(
  name='c5-envelope',
  version=json.loads(read('package.json'))['version'],
  author='Meno Abels',
  author_email='meno.abels@adviser.com',
  setup_requires=[],
  install_requires=[],
  ext_modules=[],
  cmdclass={
        'install': PreInstallCommand,
    },
  # packages=setuptools.find_packages(),
  packages=['c5_envelope'],
  package_dir={
      'c5_envelope': 'lang/python'
  },
  description="C5-ENVELOPE Repository",
  long_description=read('README.md'),
  long_description_content_type="text/markdown",
  keywords = "data ocean lake",
  url = "https://github.com/mabels/envelope",
  classifiers=[
    "Intended Audience :: Developers",
    "Development Status :: 5 - Production/Stable",
    "Programming Language :: Python",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.6",
    "Programming Language :: Python :: 3.7",
    "Programming Language :: Python :: 3.8",
    "Topic :: Scientific/Engineering",
    "Intended Audience :: Developers"
  ], 
)
